import { CURRENCY } from "@/lib/constants";

export function formatAmount(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount))} ${CURRENCY}`;
}

export function progressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (current / target) * 100));
}

export function daysRemaining(deadline: string): number {
  const end = new Date(deadline);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
