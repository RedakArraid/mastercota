import { randomUUID } from 'node:crypto';
import { pool, query, transaction } from './db.js';
import { paystackFetch } from './paystack.js';
import { canExtend, deadlineFromDuration, FREE_COTISATIONS_PER_PHONE, FREE_DURATION_DAYS, MAX_DURATION_DAYS, quoteDuration, EXTENSION_FEE, EXTENSION_DAYS } from './fees.js';

export async function freeEligibleForPhone(phone: string): Promise<boolean> {
  const { rows } = await query(`SELECT free_cotisations_used FROM phone_entitlements WHERE phone = $1`, [phone]);
  return Number(rows[0]?.free_cotisations_used ?? 0) < FREE_COTISATIONS_PER_PHONE;
}

export async function getOwnerPhone(userId: string): Promise<string | null> {
  const { rows } = await query(`SELECT phone FROM users WHERE id = $1`, [userId]);
  return rows[0]?.phone ?? null;
}

export function appBaseUrl() {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export type VerifiedCharge = { reference: string; status: string; amount: number; currency: string };

/** Both the webhook and the checkout return use this single transaction. */
export async function activatePlatformPayment(reference: string, charge: VerifiedCharge) {
  return transaction(async client => {
    const { rows } = await client.query(`SELECT * FROM platform_payments WHERE paystack_reference = $1 FOR UPDATE`, [reference]);
    const payment = rows[0];
    if (!payment) return { ok: false as const, error: 'Paiement introuvable' };
    if (charge.reference !== reference || charge.status !== 'success' || charge.currency !== payment.currency || Number(charge.amount) !== Number(payment.amount) * 100) {
      return { ok: false as const, error: 'Montant, devise ou référence de paiement incohérent' };
    }
    if (payment.status === 'paid') return { ok: true as const, already: true, payment };
    if (!payment.cotisation_id) return { ok: false as const, error: 'Cotisation introuvable' };
    const { rows: cots } = await client.query(`SELECT * FROM cotisations WHERE id = $1 FOR UPDATE`, [payment.cotisation_id]);
    const cot = cots[0];
    if (!cot) return { ok: false as const, error: 'Cotisation introuvable' };
    // Old checkouts may still settle. Never apply the same service twice.
    const { rows: applied } = await client.query(`SELECT id FROM platform_payments WHERE cotisation_id = $1 AND purpose = $2 AND status = 'paid' LIMIT 1`, [cot.id, payment.purpose]);
    let duplicate = applied.length > 0;
    if (!duplicate && payment.purpose === 'create') {
      const duration = Number(payment.duration_days);
      if (!Number.isInteger(duration) || duration < 1 || duration > MAX_DURATION_DAYS) throw new Error('Durée de paiement invalide');
      await client.query(`UPDATE cotisations SET status = CASE WHEN current_amount >= target_amount THEN 'completed' ELSE 'active' END, platform_fee_status = 'paid', starts_at = CURRENT_DATE, deadline = CURRENT_DATE + $2::int WHERE id = $1`, [cot.id, duration]);
    }
    if (!duplicate && payment.purpose === 'extend') {
      const ext = canExtend({ startsAt: cot.starts_at, deadline: cot.deadline, extensionCount: Number(cot.extension_count) });
      if (!ext.ok) throw new Error(ext.error);
      await client.query(`UPDATE cotisations SET deadline = $2::date, extension_count = extension_count + 1,
        status = CASE WHEN current_amount >= target_amount THEN 'completed' WHEN $2::date >= CURRENT_DATE THEN 'active' ELSE 'closed' END WHERE id = $1`, [cot.id, ext.newDeadline]);
    }
    const { rows: updated } = await client.query(`UPDATE platform_payments SET status = 'paid', paid_at = now(), metadata = metadata || $2::jsonb WHERE id = $1 RETURNING *`, [payment.id, JSON.stringify({ duplicate })]);
    await client.query(`INSERT INTO notifications (user_id, title, body, cotisation_id) VALUES ($1,$2,$3,$4)`, [payment.user_id, duplicate ? 'Paiement à examiner' : 'Paiement confirmé', duplicate ? 'Un paiement supplémentaire a été reçu pour le même service. Contactez le support avec sa référence.' : payment.purpose === 'extend' ? 'La prolongation de votre cotisation est confirmée.' : 'Votre cotisation est active.', cot.id]);
    return { ok: true as const, already: false, payment: updated[0] };
  });
}

export async function initializePlatformFeePaystack(options: {
  userId: string; phone: string; cotisationId: string; purpose: 'create' | 'extend';
  amount: number; durationDays?: number; metadata?: Record<string, unknown>; callbackPath: string;
}) {
  const client = await pool.connect();
  const lock = `payment:${options.cotisationId}`;
  try {
    // Session lock serializes checkout creation without keeping a transaction open during HTTP.
    await client.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', [lock]);
    const { rows: cotRows } = await client.query(`SELECT * FROM cotisations WHERE id = $1 AND owner_id = $2`, [options.cotisationId, options.userId]);
    const cot = cotRows[0];
    if (!cot) throw new Error('Cotisation introuvable');
    if (options.purpose === 'create' && (cot.status !== 'pending_fee' || cot.platform_fee_status !== 'pending')) throw new Error('Aucun frais de création en attente');
    if (options.purpose === 'extend') {
      if (!['active', 'closed'].includes(cot.status)) throw new Error('Cette cotisation ne peut pas être prolongée');
      const ext = canExtend({ startsAt: cot.starts_at, deadline: cot.deadline, extensionCount: Number(cot.extension_count) });
      if (!ext.ok) throw new Error(ext.error);
      if (ext.newDeadline < new Date().toISOString().slice(0, 10)) throw new Error('La prolongation serait déjà expirée. Créez une nouvelle cotisation.');
    }
    const { rows: previous } = await client.query(`SELECT * FROM platform_payments WHERE cotisation_id = $1 AND purpose = $2 AND status IN ('pending','paid') ORDER BY created_at DESC LIMIT 1`, [cot.id, options.purpose]);
    if (previous[0]?.status === 'paid') throw new Error('Ces frais ont déjà été payés');
    if (previous[0]?.authorization_url) return { authorization_url: previous[0].authorization_url as string, reference: previous[0].paystack_reference as string };
    const reference = previous[0]?.paystack_reference ?? randomUUID();
    const amount = options.purpose === 'create' ? Number(cot.platform_fee_amount) : EXTENSION_FEE;
    const duration = options.purpose === 'create' ? Number(cot.duration_days) : EXTENSION_DAYS;
    // Persist before contacting Paystack: a fast webhook or a network interruption cannot orphan a payment.
    if (!previous[0]) await client.query(`INSERT INTO platform_payments (id,user_id,cotisation_id,purpose,amount,duration_days,status,paystack_reference,currency,metadata) VALUES ($1::uuid,$2,$3,$4,$5,$6,'pending',$1::text,'XOF',$7::jsonb)`, [reference, options.userId, cot.id, options.purpose, amount, duration, JSON.stringify(options.metadata ?? {})]);
    await client.query(`UPDATE cotisations SET platform_fee_reference = $1 WHERE id = $2`, [reference, cot.id]);
    const { ok, data } = await paystackFetch('/transaction/initialize', { method: 'POST', body: JSON.stringify({
      email: `${options.phone.replace(/\D/g, '')}@mastercota.com`, amount: amount * 100, currency: 'XOF', reference,
      callback_url: `${appBaseUrl()}${options.callbackPath}?ref=${reference}`,
      metadata: { type: 'platform_fee', purpose: options.purpose, cotisation_id: cot.id, user_id: options.userId, duration_days: duration },
    }) });
    if (!ok || !data.data?.authorization_url) throw new Error('Le paiement ne peut pas être ouvert. Réessayez ou contactez le support avec la référence affichée.');
    const url = new URL(data.data.authorization_url);
    if (url.protocol !== 'https:' || !(url.hostname === 'checkout.paystack.com' || url.hostname.endsWith('.paystack.com'))) throw new Error('URL de paiement invalide');
    await client.query(`UPDATE platform_payments SET authorization_url = $2 WHERE id = $1`, [reference, url.toString()]);
    return { authorization_url: url.toString(), reference };
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [lock]).catch(() => {});
    client.release();
  }
}

export { canExtend, deadlineFromDuration, FREE_DURATION_DAYS, MAX_DURATION_DAYS, quoteDuration, EXTENSION_FEE, EXTENSION_DAYS };
