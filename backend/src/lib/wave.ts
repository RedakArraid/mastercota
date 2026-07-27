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

export function normalizeWavePayLink(raw: string): string | null {
  const t = String(raw || "").trim();
  if (!t) return null;
  try {
    const url = new URL(t.startsWith("http") ? t : `https://${t}`);
    if (!url.hostname.endsWith("wave.com")) return null;
    if (!url.pathname.includes("/m/")) return null;
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
