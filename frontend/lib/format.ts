import { CURRENCY } from "@/lib/constants";

export function formatAmount(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount))} ${CURRENCY}`;
}

export function progressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (current / target) * 100));
}

export function daysRemaining(deadline: string): number {
  // Cagnottes close after the calendar deadline in UTC (Côte d’Ivoire).
  const end = Date.parse(`${deadline.slice(0, 10)}T00:00:00Z`);
  const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((end - today) / 86_400_000);
}

export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const ts = Date.now().toString().slice(-5);
  return `${base}-${ts}`;
}

export function remainingLabel(deadline: string): string {
  const days = daysRemaining(deadline);
  return days < 0 ? "Échéance dépassée" : days === 0 ? "Dernier jour" : `${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""}`;
}
