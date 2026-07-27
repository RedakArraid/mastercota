/** Wave P2P helpers — côté API */

export function digitsOnly(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

export function normalizeWavePhone(phone: string): string | null {
  const raw = String(phone || "").trim();
  const d = digitsOnly(raw);
  if (d.length < 8) return null;
  if (raw.startsWith("+")) return `+${d}`;
  if (d.startsWith("225") && d.length >= 13) return `+${d}`;
  if (d.length === 10 && d.startsWith("0")) return `+225${d.slice(1)}`;
  if (d.length === 9) return `+225${d}`;
  return `+${d}`;
}
