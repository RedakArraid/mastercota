/**
 * Frais de plateforme (organisateur) — aligné sur backend/src/lib/fees.ts
 * Contributions : 0 % (suivi Wave direct / confirmation).
 */

export const FREE_DURATION_DAYS = 35;
export const FREE_COTISATIONS_PER_PHONE = 1;
export const MAX_DURATION_DAYS = 60;
export const EXTENSION_DAYS = 10;
export const EXTENSION_FEE = 2000;

export const DURATION_PRESETS = [
  { days: 15, fee: 2000, label: "15 jours" },
  { days: 35, fee: 4000, label: "35 jours" },
  { days: 60, fee: 10_000, label: "60 jours" },
] as const;

export function platformFeeForDuration(days: number): number | null {
  const d = Math.round(Number(days));
  if (!Number.isFinite(d) || d < 1 || d > MAX_DURATION_DAYS) return null;
  if (d <= 15) return 2000;
  if (d <= 35) return 4000;
  return 10_000;
}

export type DurationQuote = {
  durationDays: number;
  fee: number;
  isFree: boolean;
  label: string;
};

export function quoteDuration(options: {
  durationDays: number;
  freeEligible: boolean;
  useFree?: boolean;
}): DurationQuote | null {
  const durationDays = Math.round(Number(options.durationDays));
  if (
    !Number.isFinite(durationDays) ||
    durationDays < 1 ||
    durationDays > MAX_DURATION_DAYS
  ) {
    return null;
  }

  if (
    options.useFree &&
    options.freeEligible &&
    durationDays === FREE_DURATION_DAYS
  ) {
    return {
      durationDays,
      fee: 0,
      isFree: true,
      label: `Gratuit · ${FREE_DURATION_DAYS} jours (1re cotisation)`,
    };
  }

  const fee = platformFeeForDuration(durationDays);
  if (fee == null) return null;
  return {
    durationDays,
    fee,
    isFree: false,
    label: `${durationDays} jours · ${fee.toLocaleString("fr-FR")} FCFA`,
  };
}

export function canExtend(options: {
  startsAt: string | Date;
  deadline: string | Date;
  extensionCount: number;
  maxExtensions?: number;
}):
  | { ok: true; newDeadline: string; fee: number }
  | { ok: false; error: string } {
  const maxExt = options.maxExtensions ?? 1;
  if (options.extensionCount >= maxExt) {
    return { ok: false, error: "Prolongation déjà utilisée" };
  }
  const start = toDateOnly(options.startsAt);
  const currentEnd = toDateOnly(options.deadline);
  if (!start || !currentEnd) {
    return { ok: false, error: "Dates invalides" };
  }
  const maxEnd = addDays(start, MAX_DURATION_DAYS);
  const proposed = addDays(currentEnd, EXTENSION_DAYS);
  if (proposed > maxEnd) {
    const remaining = daysBetween(currentEnd, maxEnd);
    if (remaining <= 0) {
      return {
        ok: false,
        error: `Durée maximale atteinte (${MAX_DURATION_DAYS} jours)`,
      };
    }
    return {
      ok: false,
      error: `Il ne reste que ${remaining} jour(s) avant le plafond de ${MAX_DURATION_DAYS} jours`,
    };
  }
  return {
    ok: true,
    newDeadline: formatDateOnly(proposed),
    fee: EXTENSION_FEE,
  };
}

function toDateOnly(v: string | Date): Date | null {
  if (v instanceof Date) {
    return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  }
  const m = String(v).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function deadlineFromDuration(
  durationDays: number,
  from = new Date()
): string {
  return formatDateOnly(addDays(toDateOnly(from)!, durationDays));
}

/** Plus de frais contributeur. */
export const PLATFORM_RATE = 0;
export const PAYSTACK_MOMO_RATE = 0;
export const SERVICE_RATE = 0;
export const SERVICE_FEE_LABEL = "0 %";

export type FeeQuote = { net: number; gross: number; fee: number };

export function roundUpTo5(n: number): number {
  return Math.ceil(n / 5) * 5;
}

export function feesFromNet(netInput: number): FeeQuote | null {
  const net = Math.round(Number(netInput));
  if (!Number.isFinite(net) || net <= 0) return null;
  return { net, gross: net, fee: 0 };
}
