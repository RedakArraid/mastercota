import { HTTPException } from "hono/http-exception";

export function invalid(message: string): never {
  throw new HTTPException(400, { message });
}

export function requestIdField(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) invalid('Identifiant de requête UUID requis');
  return value.toLowerCase();
}

export function textField(value: unknown, label: string, max: number, required = true): string {
  if (typeof value !== "string") {
    if (!required && value == null) return "";
    invalid(`${label} invalide`);
  }
  const result = value.trim();
  if ((required && !result) || result.length > max) invalid(`${label} invalide (maximum ${max} caractères)`);
  return result;
}

export function amountField(value: unknown): number {
  if (typeof value !== "number" && typeof value !== "string") invalid("Montant invalide");
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000) invalid("Le montant doit être un entier entre 1 et 1 000 000 000 FCFA");
  return amount;
}

export function phoneField(value: unknown): string {
  const phone = textField(value, "Téléphone", 25).replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) invalid("Numéro international requis, par exemple +2250700000000");
  if (phone.startsWith("+225") && !/^\+225\d{10}$/.test(phone)) invalid("Le numéro ivoirien doit comporter 10 chiffres après +225");
  return phone;
}

export function settingsField(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Paramètres invalides");
  const result: Record<string, unknown> = {};
  const input = value as Record<string, unknown>;
  for (const key of ["show_best_contributor", "show_contributors", "show_progress", "show_target_amount", "anonymous_allowed"]) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== "boolean") invalid(`Paramètre ${key} invalide`);
      result[key] = input[key];
    }
  }
  if (input.min_amount !== undefined) result.min_amount = input.min_amount === 0 ? 0 : amountField(input.min_amount);
  if (input.share_message !== undefined) result.share_message = textField(input.share_message, "Message de partage", 1000, false) || null;
  return result;
}

export function optionalUrl(value: unknown): string | null {
  if (value == null || value === "") return null;
  const input = textField(value, "URL", 2048);
  try {
    const url = new URL(input);
    if (url.protocol === "https:") return url.toString();
  } catch { /* validated below */ }
  return invalid("URL HTTPS requise");
}
