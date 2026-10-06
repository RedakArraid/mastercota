/** Wave Business helpers — côté API */

export function digitsOnly(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

export function normalizeWavePhone(phone: string): string | null {
  const raw = String(phone || "").trim();
  const d = digitsOnly(raw);
  if (d.length < 8) return null;
  if (raw.startsWith("+")) return `+${d}`;
  if (d.startsWith("225") && d.length >= 13) return `+${d}`;
  if (d.length === 10 && d.startsWith("0")) return `+225${d}`;
  return `+${d}`;
}

/**
 * Accepte un lien Wave Business :
 * https://pay.wave.com/m/M_xxx…  ou  …/m/M_xxx/c/ci/
 */
export function normalizeWavePayLink(raw: string): string | null {
  const t = String(raw || "").trim();
  if (!t) return null;
  try {
    const url = new URL(t.startsWith("http") ? t : `https://${t}`);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || host !== "pay.wave.com" || url.username || url.password || url.port) return null;

    const match = url.pathname.match(
      /^\/m\/(M_[A-Za-z0-9_-]+)(?:\/c\/([a-z]{2}))?\/?$/i
    );
    if (!match) return null;

    const merchantId = match[1];
    const country = (match[2] || "ci").toLowerCase();
    return `https://pay.wave.com/m/${merchantId}/c/${country}/`;
  } catch {
    return null;
  }
}
