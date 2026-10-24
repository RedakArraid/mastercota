import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool, query, transaction } from './db.js';
import { paystackFetch } from './paystack.js';
import { createPispiRequestToPay, getPispiRequestToPay, PispiApiError, pispiEndToEndId, pispiStatus, type PispiRequestToPay } from './pispi.js';
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

/** Charge receipt and service delivery are recorded independently, in one transaction. */
async function activateReceivedPlatformPayment(options: {
  reference: string;
  provider: 'paystack' | 'pispi';
  validate: (payment: Record<string, any>) => string | null;
  metadata?: Record<string, unknown>;
  existingClient?: PoolClient;
}) {
  return transaction(async client => {
    const { rows } = await client.query(
      `SELECT * FROM platform_payments
       WHERE provider = $1
         AND (provider_reference = $2 OR ($1 = 'paystack' AND paystack_reference = $2))
       FOR UPDATE`,
      [options.provider, options.reference]
    );
    const payment = rows[0];
    if (!payment) return { ok: false as const, error: 'Paiement introuvable' };
    const validationError = options.validate(payment);
    if (validationError) return { ok: false as const, error: validationError };
    if (payment.status === 'paid') return { ok: true as const, already: true, payment };

    const { rows: cots } = await client.query(`SELECT *, CURRENT_DATE::text AS today FROM cotisations WHERE id = $1 FOR UPDATE`, [payment.cotisation_id]);
    const cot = cots[0];
    let reviewReason: string | null = cot ? null : 'cotisation_missing';
    if (cot) {
      const { rows: applied } = await client.query(`SELECT id FROM platform_payments WHERE cotisation_id = $1 AND purpose = $2 AND application_status = 'applied' LIMIT 1`, [cot.id, payment.purpose]);
      if (applied.length || (payment.purpose === 'extend' && Number(cot.extension_count) > 0)) reviewReason = 'duplicate_service';
      if (!reviewReason && payment.purpose === 'create') {
        const duration = Number(payment.duration_days);
        if (!Number.isInteger(duration) || duration < 1 || duration > MAX_DURATION_DAYS) reviewReason = 'invalid_duration';
        else if (cot.status !== 'pending_fee' || cot.platform_fee_status !== 'pending') reviewReason = 'creation_not_pending';
        else await client.query(`UPDATE cotisations SET status = CASE WHEN current_amount >= target_amount THEN 'completed' ELSE 'active' END, close_reason = NULL, platform_fee_status = 'paid', starts_at = CURRENT_DATE, deadline = CURRENT_DATE + $2::int WHERE id = $1`, [cot.id, duration]);
      }
      if (!reviewReason && payment.purpose === 'extend') {
        const ext = canExtend({ startsAt: cot.starts_at, deadline: cot.deadline, extensionCount: Number(cot.extension_count) });
        if (!ext.ok) reviewReason = 'extension_unavailable';
        else if (ext.newDeadline < cot.today) reviewReason = 'extension_expired';
        else if (payment.metadata?.new_deadline && payment.metadata.new_deadline !== ext.newDeadline) reviewReason = 'extension_dates_changed';
        else if (cot.status === 'pending_fee' || cot.platform_fee_status === 'pending') reviewReason = 'creation_not_paid';
        else await client.query(`UPDATE cotisations SET deadline = $2::date, extension_count = extension_count + 1,
          status = CASE WHEN status = 'closed' AND close_reason = 'manual' THEN 'closed' WHEN current_amount >= target_amount THEN 'completed' ELSE 'active' END,
          close_reason = CASE WHEN status = 'closed' AND close_reason = 'manual' THEN 'manual' ELSE NULL END WHERE id = $1`, [cot.id, ext.newDeadline]);
      }
    }
    const applicationStatus = reviewReason ? 'review_required' : 'applied';
    const { rows: updated } = await client.query(
      `UPDATE platform_payments
       SET status = 'paid', paid_at = now(), application_status=$2, review_reason=$3,
           metadata = metadata || $4::jsonb
       WHERE id=$1 RETURNING *`,
      [payment.id, applicationStatus, reviewReason, JSON.stringify(options.metadata ?? {})]
    );
    const title = reviewReason ? 'Paiement à examiner' : 'Paiement confirmé';
    const body = reviewReason ? `Votre paiement a été reçu, mais le service n’a pas été appliqué. Contactez le support avec la référence ${options.reference}. Aucun remboursement automatique n’a été effectué.` : payment.purpose === 'extend' ? 'La prolongation de votre cotisation est confirmée. Une clôture manuelle reste conservée.' : 'Votre cotisation est active.';
    await client.query(`INSERT INTO notifications (user_id,title,body,cotisation_id) VALUES ($1,$2,$3,$4)`, [payment.user_id, title, body, cot?.id ?? null]);
    if (reviewReason) await client.query(`INSERT INTO notifications (user_id,title,body,cotisation_id) SELECT id,$1,$2,$3 FROM users WHERE role='admin' AND id<>$4`, [title, `Paiement ${options.reference} à examiner : ${reviewReason}.`, cot?.id ?? null, payment.user_id]);
    return { ok: true as const, already: false, payment: updated[0] };
  }, options.existingClient);
}

export async function activatePlatformPayment(reference: string, charge: VerifiedCharge, existingClient?: PoolClient) {
  return activateReceivedPlatformPayment({
    reference,
    provider: 'paystack',
    existingClient,
    validate: payment => (
      charge.reference !== reference ||
      charge.status !== 'success' ||
      charge.currency !== payment.currency ||
      Number(charge.amount) !== Number(payment.amount) * 100
    ) ? 'Montant, devise ou référence de paiement incohérent' : null,
  });
}

export async function activatePispiPlatformPayment(reference: string, charge: PispiRequestToPay, existingClient?: PoolClient) {
  const end2endId = pispiEndToEndId(charge);
  return activateReceivedPlatformPayment({
    reference,
    provider: 'pispi',
    existingClient,
    metadata: {
      pispi_status: pispiStatus(charge),
      ...(end2endId ? { pispi_end2end_id: end2endId } : {}),
    },
    validate: payment => (
      charge.txId !== reference ||
      pispiStatus(charge) !== 'IRREVOCABLE' ||
      Number(charge.montant) !== Number(payment.amount)
    ) ? 'Montant, statut ou référence PI-SPI incohérent' : null,
  });
}

function completedCheckout(payment: Record<string, any>) {
  return { payment_required: false as const, provider: (payment.provider ?? 'paystack') as string, reference: (payment.provider_reference ?? payment.paystack_reference) as string, application_status: payment.application_status as string, review_reason: payment.review_reason as string | null, review_resolved_at: payment.review_resolved_at, review_resolution_note: payment.review_resolution_note };
}

export async function initializePlatformFeePaystack(options: {
  userId: string; phone: string; cotisationId: string; purpose: 'create' | 'extend';
  amount: number; durationDays?: number; metadata?: Record<string, unknown>; callbackPath: string;
}) {
  const client = await pool.connect();
  const lock = `payment:${options.cotisationId}`;
  try {
    // Serialize checkout retries. A provider timeout never permits an unverified second charge.
    await client.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', [lock]);
    const { rows: previous } = await client.query(`SELECT * FROM platform_payments WHERE cotisation_id=$1 AND purpose=$2 AND user_id=$3 ORDER BY created_at DESC LIMIT 1`, [options.cotisationId, options.purpose, options.userId]);
    let existing = previous[0];
    if (existing?.application_status === 'review_required' && existing.review_resolved_at) existing = undefined;
    if (existing?.status === 'paid') return completedCheckout(existing);
    if (existing && existing.provider !== 'paystack') {
      if (existing.status === 'failed') existing = undefined;
      else throw new Error('Un paiement via un autre moyen est déjà en cours. Terminez-le ou attendez sa résolution avant de choisir Paystack.');
    }
    if (existing) {
      const verified = await paystackFetch(`/transaction/verify/${encodeURIComponent(existing.paystack_reference)}`);
      if (verified.ok && verified.data.data?.status === 'success') {
        const result = await activatePlatformPayment(existing.paystack_reference, verified.data.data, client);
        if (!result.ok) throw new Error(result.error);
        return completedCheckout(result.payment);
      }
      const providerStatus = verified.data.data?.status;
      const notFound = !verified.ok && [400,404].includes(verified.status) && /transaction.*not found|reference.*not found/i.test(verified.data.message ?? '');
      if (!verified.ok && !notFound) throw new Error('Vérification du paiement indisponible. Aucun nouveau paiement n’a été créé. Réessayez.');
      if (providerStatus === 'failed' || (providerStatus === 'abandoned' && !existing.authorization_url)) {
        // A lost initialize response had no checkout URL delivered to the client. Its unused reference stays auditable.
        await client.query(`UPDATE platform_payments SET status='failed', metadata=metadata || $2::jsonb WHERE id=$1 AND status='pending'`, [existing.id, JSON.stringify({ provider_status: providerStatus, replaced_without_checkout: !existing.authorization_url })]);
        existing = undefined;
      } else if (providerStatus === 'reversed') {
        throw new Error('Ce paiement a été annulé ou remboursé par le prestataire. Contactez le support avant un nouveau paiement.');
      } else if (!existing.authorization_url && !notFound) {
        throw new Error('Un paiement est déjà en cours de vérification. Réessayez dans un instant ; aucun second paiement n’a été créé.');
      }
    }
    const { rows: cotRows } = await client.query(`SELECT *, CURRENT_DATE::text AS today FROM cotisations WHERE id=$1 AND owner_id=$2`, [options.cotisationId, options.userId]);
    const cot = cotRows[0];
    if (!cot) throw new Error('Cotisation introuvable');
    const { rows: reviews } = await client.query("SELECT id FROM platform_payments WHERE cotisation_id=$1 AND application_status='review_required' AND review_resolved_at IS NULL LIMIT 1", [cot.id]);
    if (reviews[0]) throw new Error('Un paiement reçu doit être examiné par le support avant de démarrer un autre paiement.');
    const { rows: settled } = await client.query(`SELECT * FROM platform_payments WHERE cotisation_id=$1 AND purpose=$2 AND status='paid' AND application_status='applied' LIMIT 1`, [cot.id, options.purpose]);
    if (settled[0]) return completedCheckout(settled[0]);
    if (options.purpose === 'create' && (cot.status !== 'pending_fee' || cot.platform_fee_status !== 'pending')) throw new Error('Aucun frais de création en attente');
    let metadata = options.metadata ?? {};
    if (options.purpose === 'extend') {
      if (Number(cot.current_amount) >= Number(cot.target_amount)) throw new Error('L’objectif est atteint. Augmentez-le avant de demander une prolongation.');
      if (!['active', 'closed'].includes(cot.status) || cot.platform_fee_status === 'pending') throw new Error('Cette cotisation ne peut pas être prolongée');
      const ext = canExtend({ startsAt: cot.starts_at, deadline: cot.deadline, extensionCount: Number(cot.extension_count) });
      if (!ext.ok) throw new Error(ext.error);
      if (ext.newDeadline < cot.today) throw new Error('La prolongation serait déjà expirée. Créez une nouvelle cotisation.');
      metadata = { ...metadata, new_deadline: ext.newDeadline };
    }
    if (existing?.authorization_url) return { payment_required: true as const, provider: 'paystack' as const, authorization_url: existing.authorization_url as string, reference: existing.paystack_reference as string };
    const reference = existing?.paystack_reference ?? randomUUID();
    const amount = options.purpose === 'create' ? Number(cot.platform_fee_amount) : EXTENSION_FEE;
    const duration = options.purpose === 'create' ? Number(cot.duration_days) : EXTENSION_DAYS;
    if (!existing) await client.query(`INSERT INTO platform_payments (id,user_id,cotisation_id,purpose,amount,duration_days,status,paystack_reference,provider,provider_reference,currency,metadata) VALUES ($1::uuid,$2,$3,$4,$5,$6,'pending',$1::text,'paystack',$1::text,'XOF',$7::jsonb)`, [reference, options.userId, cot.id, options.purpose, amount, duration, JSON.stringify(metadata)]);
    await client.query(`UPDATE cotisations SET platform_fee_reference=$1 WHERE id=$2`, [reference, cot.id]);
    const { ok, data } = await paystackFetch('/transaction/initialize', { method: 'POST', body: JSON.stringify({
      email: `${options.phone.replace(/\D/g, '')}@mastercota.com`, amount: amount * 100, currency: 'XOF', reference,
      callback_url: `${appBaseUrl()}${options.callbackPath}?ref=${reference}`,
      metadata: { type: 'platform_fee', purpose: options.purpose, cotisation_id: cot.id, user_id: options.userId, duration_days: duration },
    }) });
    if (!ok || !data.data?.authorization_url) throw new Error('Le paiement ne peut pas être ouvert. Réessayez ou contactez le support avec la référence affichée.');
    const url = new URL(data.data.authorization_url);
    if (url.protocol !== 'https:' || !(url.hostname === 'checkout.paystack.com' || url.hostname.endsWith('.paystack.com'))) throw new Error('URL de paiement invalide');
    await client.query(`UPDATE platform_payments SET authorization_url=$2 WHERE id=$1`, [reference, url.toString()]);
    const { rows: paid } = await client.query(`SELECT * FROM platform_payments WHERE cotisation_id=$1 AND purpose=$2 AND status='paid' AND (application_status<>'review_required' OR review_resolved_at IS NULL) LIMIT 1`, [cot.id, options.purpose]);
    if (paid[0]) return completedCheckout(paid[0]);
    return { payment_required: true as const, provider: 'paystack' as const, authorization_url: url.toString(), reference };
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [lock]).catch(() => {});
    client.release();
  }
}


export async function initializePlatformFeePispi(options: {
  userId: string;
  cotisationId: string;
  purpose: 'create' | 'extend';
  payerAlias: string;
  metadata?: Record<string, unknown>;
}) {
  const client = await pool.connect();
  const lock = `payment:${options.cotisationId}`;
  try {
    await client.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', [lock]);
    const { rows: previous } = await client.query(
      `SELECT * FROM platform_payments WHERE cotisation_id=$1 AND purpose=$2 AND user_id=$3 ORDER BY created_at DESC LIMIT 1`,
      [options.cotisationId, options.purpose, options.userId]
    );
    let existing = previous[0];
    if (existing?.application_status === 'review_required' && existing.review_resolved_at) existing = undefined;
    if (existing?.status === 'paid') return completedCheckout(existing);
    if (existing && existing.provider !== 'pispi') {
      if (existing.status === 'failed') existing = undefined;
      else throw new Error('Un paiement via un autre moyen est déjà en cours. Terminez-le ou attendez sa résolution avant de choisir PI-SPI.');
    }

    if (existing) {
      try {
        const remote = await getPispiRequestToPay(existing.provider_reference);
        const status = pispiStatus(remote);
        if (status === 'IRREVOCABLE') {
          const result = await activatePispiPlatformPayment(existing.provider_reference, remote, client);
          if (!result.ok) throw new Error(result.error);
          return completedCheckout(result.payment);
        }
        if (['REJETE', 'ANNULE'].includes(status)) {
          await client.query(
            `UPDATE platform_payments SET status='failed', metadata=metadata || $2::jsonb WHERE id=$1 AND status='pending'`,
            [existing.id, JSON.stringify({ pispi_status: status, pispi_reason: remote.statutRaison ?? null })]
          );
          existing = undefined;
        } else {
          return {
            payment_required: true as const,
            provider: 'pispi' as const,
            provider_status: status,
            reference: existing.provider_reference as string,
          };
        }
      } catch (error) {
        if (!(error instanceof PispiApiError) || error.status !== 404) {
          throw new Error('Vérification PI-SPI indisponible. Aucun nouveau paiement n’a été créé. Réessayez.');
        }
      }
    }

    const { rows: cotRows } = await client.query(`SELECT *, CURRENT_DATE::text AS today FROM cotisations WHERE id=$1 AND owner_id=$2`, [options.cotisationId, options.userId]);
    const cot = cotRows[0];
    if (!cot) throw new Error('Cotisation introuvable');
    const { rows: reviews } = await client.query("SELECT id FROM platform_payments WHERE cotisation_id=$1 AND application_status='review_required' AND review_resolved_at IS NULL LIMIT 1", [cot.id]);
    if (reviews[0]) throw new Error('Un paiement reçu doit être examiné par le support avant de démarrer un autre paiement.');
    const { rows: settled } = await client.query(`SELECT * FROM platform_payments WHERE cotisation_id=$1 AND purpose=$2 AND status='paid' AND application_status='applied' LIMIT 1`, [cot.id, options.purpose]);
    if (settled[0]) return completedCheckout(settled[0]);
    if (options.purpose === 'create' && (cot.status !== 'pending_fee' || cot.platform_fee_status !== 'pending')) throw new Error('Aucun frais de création en attente');

    let metadata = options.metadata ?? {};
    if (options.purpose === 'extend') {
      if (Number(cot.current_amount) >= Number(cot.target_amount)) throw new Error('L’objectif est atteint. Augmentez-le avant de demander une prolongation.');
      if (!['active', 'closed'].includes(cot.status) || cot.platform_fee_status === 'pending') throw new Error('Cette cotisation ne peut pas être prolongée');
      const ext = canExtend({ startsAt: cot.starts_at, deadline: cot.deadline, extensionCount: Number(cot.extension_count) });
      if (!ext.ok) throw new Error(ext.error);
      if (ext.newDeadline < cot.today) throw new Error('La prolongation serait déjà expirée. Créez une nouvelle cotisation.');
      metadata = { ...metadata, new_deadline: ext.newDeadline };
    }

    const reference = existing?.provider_reference ?? randomUUID();
    const amount = options.purpose === 'create' ? Number(cot.platform_fee_amount) : EXTENSION_FEE;
    const duration = options.purpose === 'create' ? Number(cot.duration_days) : EXTENSION_DAYS;
    if (!existing) {
      await client.query(
        `INSERT INTO platform_payments
          (id,user_id,cotisation_id,purpose,amount,duration_days,status,provider,provider_reference,currency,metadata)
         VALUES ($1::uuid,$2,$3,$4,$5,$6,'pending','pispi',$1::text,'XOF',$7::jsonb)`,
        [reference, options.userId, cot.id, options.purpose, amount, duration, JSON.stringify({ ...metadata, payer_alias: options.payerAlias })]
      );
      await client.query(`UPDATE cotisations SET platform_fee_reference=$1 WHERE id=$2`, [reference, cot.id]);
    }

    const remote = await createPispiRequestToPay({
      txId: reference,
      payerAlias: options.payerAlias,
      amount,
      purpose: options.purpose,
      cotisationId: cot.id,
    });
    const status = pispiStatus(remote);
    const end2endId = pispiEndToEndId(remote);
    await client.query(
      `UPDATE platform_payments SET metadata=metadata || $2::jsonb WHERE id=$1`,
      [reference, JSON.stringify({ pispi_status: status, ...(end2endId ? { pispi_end2end_id: end2endId } : {}) })]
    );
    if (status === 'IRREVOCABLE') {
      const result = await activatePispiPlatformPayment(reference, remote, client);
      if (!result.ok) throw new Error(result.error);
      return completedCheckout(result.payment);
    }
    if (['REJETE', 'ANNULE'].includes(status)) {
      await client.query(`UPDATE platform_payments SET status='failed' WHERE id=$1 AND status='pending'`, [reference]);
      throw new Error(`Demande PI-SPI rejetée${remote.statutRaison ? ` : ${remote.statutRaison}` : ''}`);
    }
    return {
      payment_required: true as const,
      provider: 'pispi' as const,
      provider_status: status,
      reference,
    };
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [lock]).catch(() => {});
    client.release();
  }
}

export { canExtend, deadlineFromDuration, FREE_DURATION_DAYS, MAX_DURATION_DAYS, quoteDuration, EXTENSION_FEE, EXTENSION_DAYS };
