import { randomUUID } from "crypto";
import { query } from "./db.js";
import { paystackFetch } from "./paystack.js";
import {
  canExtend,
  deadlineFromDuration,
  FREE_COTISATIONS_PER_PHONE,
  FREE_DURATION_DAYS,
  MAX_DURATION_DAYS,
  quoteDuration,
  EXTENSION_FEE,
  EXTENSION_DAYS,
} from "./fees.js";

export async function freeEligibleForPhone(phone: string): Promise<boolean> {
  const { rows } = await query<{ free_cotisations_used: number }>(
    `SELECT free_cotisations_used FROM phone_entitlements WHERE phone = $1`,
    [phone]
  );
  const used = Number(rows[0]?.free_cotisations_used ?? 0);
  return used < FREE_COTISATIONS_PER_PHONE;
}

export async function markFreeUsed(phone: string) {
  await query(
    `INSERT INTO phone_entitlements (phone, free_cotisations_used, updated_at)
     VALUES ($1, 1, now())
     ON CONFLICT (phone) DO UPDATE SET
       free_cotisations_used = phone_entitlements.free_cotisations_used + 1,
       updated_at = now()`,
    [phone]
  );
}

export async function getOwnerPhone(userId: string): Promise<string | null> {
  const { rows } = await query<{ phone: string }>(
    `SELECT phone FROM users WHERE id = $1`,
    [userId]
  );
  return rows[0]?.phone ?? null;
}

export function appBaseUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://mastercota.com"
  ).replace(/\/$/, "");
}

export async function activatePlatformPayment(reference: string) {
  const { rows } = await query<{
    id: string;
    cotisation_id: string | null;
    purpose: string;
    amount: string;
    duration_days: number | null;
    status: string;
    metadata: { new_deadline?: string };
  }>(
    `SELECT * FROM platform_payments WHERE paystack_reference = $1`,
    [reference]
  );
  const payment = rows[0];
  if (!payment) return { ok: false as const, error: "Paiement introuvable" };
  if (payment.status === "paid") {
    return { ok: true as const, already: true, payment };
  }

  await query(
    `UPDATE platform_payments
     SET status = 'paid', paid_at = now()
     WHERE id = $1 AND status <> 'paid'`,
    [payment.id]
  );

  if (payment.purpose === "create" && payment.cotisation_id) {
    await query(
      `UPDATE cotisations SET
         status = 'active',
         platform_fee_status = 'paid'
       WHERE id = $1 AND status = 'pending_fee'`,
      [payment.cotisation_id]
    );
  }

  if (payment.purpose === "extend" && payment.cotisation_id) {
    const { rows: cots } = await query<{
      deadline: string;
      starts_at: string;
      extension_count: number;
    }>(
      `SELECT deadline, starts_at, extension_count FROM cotisations WHERE id = $1`,
      [payment.cotisation_id]
    );
    if (cots[0]) {
      const ext = canExtend({
        startsAt: cots[0].starts_at,
        deadline: cots[0].deadline,
        extensionCount: Number(cots[0].extension_count),
      });
      const deadline =
        payment.metadata?.new_deadline || (ext.ok ? ext.newDeadline : null);
      if (deadline) {
        await query(
          `UPDATE cotisations SET
             deadline = $1,
             extension_count = extension_count + 1,
             status = CASE WHEN status = 'closed' THEN 'active' ELSE status END
           WHERE id = $2`,
          [deadline, payment.cotisation_id]
        );
      }
    }
  }

  return { ok: true as const, already: false, payment };
}

export async function initializePlatformFeePaystack(options: {
  userId: string;
  phone: string;
  cotisationId: string;
  purpose: "create" | "extend";
  amount: number;
  durationDays?: number;
  metadata?: Record<string, unknown>;
  callbackPath: string;
}) {
  const reference = randomUUID();
  const cleanPhone = options.phone.replace(/[^0-9]/g, "");
  const payload = {
    email: `${cleanPhone}@mastercota.com`,
    amount: Math.round(options.amount * 100),
    reference,
    callback_url: `${appBaseUrl()}${options.callbackPath}?ref=${reference}`,
    metadata: {
      type: "platform_fee",
      purpose: options.purpose,
      cotisation_id: options.cotisationId,
      user_id: options.userId,
      duration_days: options.durationDays ?? null,
      ...options.metadata,
    },
  };
  const { ok, data } = await paystackFetch("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!ok) {
    throw new Error(data.message || "Initialisation paiement frais échouée");
  }
  await query(
    `INSERT INTO platform_payments
      (id, user_id, cotisation_id, purpose, amount, duration_days, status, paystack_reference, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',$1,$7::jsonb)`,
    [
      reference,
      options.userId,
      options.cotisationId,
      options.purpose,
      options.amount,
      options.durationDays ?? null,
      JSON.stringify(options.metadata ?? {}),
    ]
  );
  await query(
    `UPDATE cotisations SET platform_fee_reference = $1 WHERE id = $2`,
    [reference, options.cotisationId]
  );
  return {
    authorization_url: data.data.authorization_url as string,
    reference,
  };
}

export {
  canExtend,
  deadlineFromDuration,
  FREE_DURATION_DAYS,
  MAX_DURATION_DAYS,
  quoteDuration,
  EXTENSION_FEE,
  EXTENSION_DAYS,
};
