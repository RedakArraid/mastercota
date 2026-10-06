/** Helpers Wave — mode Business (lien) ou Perso (numéro) */

export type WavePayoutMode = "business" | "phone";

export function digitsOnly(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

export function normalizeWavePhone(phone: string): string | null {
  const d = digitsOnly(phone);
  if (d.length < 8) return null;
  if (phone.trim().startsWith("+")) return `+${d}`;
  if (d.startsWith("225") && d.length >= 13) return `+${d}`;
  if (d.length === 10 && d.startsWith("0")) return `+225${d}`;
  return `+${d}`;
}

export function formatWaveDisplay(phone: string) {
  const d = digitsOnly(phone);
  if (d.startsWith("225") && d.length >= 13) {
    const local = d.slice(3);
    return `+225 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 8)} ${local.slice(8)}`.trim();
  }
  return phone;
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

export function resolveWavePayoutMode(options: {
  mode?: WavePayoutMode | null;
  wavePayLink?: string | null;
  wavePhone?: string | null;
}): WavePayoutMode | null {
  if (options.mode === "business" || options.mode === "phone") {
    return options.mode;
  }
  if (options.wavePayLink) return "business";
  if (options.wavePhone) return "phone";
  return null;
}

export function hasWavePayoutConfigured(options: {
  mode?: WavePayoutMode | null;
  wavePayLink?: string | null;
  wavePhone?: string | null;
}) {
  const mode = resolveWavePayoutMode(options);
  if (mode === "business") return Boolean(options.wavePayLink);
  if (mode === "phone") return Boolean(options.wavePhone);
  return false;
}

/** URL Wave avec montant prérempli. */
export function wavePayUrlWithAmount(payLink: string, amount: number): string {
  const base =
    normalizeWavePayLink(payLink) ||
    (payLink.endsWith("/") ? payLink : `${payLink}/`);
  const amt = Math.round(amount);
  return `${base}?amount=${amt}`;
}

/** Mode Business : ouvre pay.wave.com avec montant. */
export async function launchWaveBusiness(options: {
  amount: number;
  wavePayLink: string;
}): Promise<{ mode: "business"; url: string }> {
  const url = wavePayUrlWithAmount(options.wavePayLink, options.amount);
  // Open synchronously inside the click event and keep this form available.
  const popup = window.open("about:blank", "_blank");
  if (!popup) throw new Error("Autorisez l’ouverture de Wave dans un nouvel onglet, puis réessayez");
  popup.opener = null;
  popup.location.replace(url);
  return { mode: "business", url };
}

/** Mode Perso : copie numéro + montant, tente d’ouvrir Wave. */
export async function launchWavePhone(options: {
  amount: number;
  wavePhone: string;
}): Promise<{ mode: "phone"; phoneDisplay: string }> {
  const display = formatWaveDisplay(options.wavePhone);
  const digits = digitsOnly(options.wavePhone);
  try {
    await navigator.clipboard.writeText(digits);
  } catch {
    /* ignore */
  }
  // Best-effort ouverture app
  window.location.href = "wave://";
  return { mode: "phone", phoneDisplay: display };
}

export async function launchWavePayment(options: {
  amount: number;
  mode: WavePayoutMode;
  wavePayLink?: string | null;
  wavePhone?: string | null;
}) {
  if (options.mode === "business") {
    if (!options.wavePayLink) {
      throw new Error("Lien Wave Business manquant");
    }
    return launchWaveBusiness({
      amount: options.amount,
      wavePayLink: options.wavePayLink,
    });
  }
  if (!options.wavePhone) {
    throw new Error("Numéro Wave manquant");
  }
  return launchWavePhone({
    amount: options.amount,
    wavePhone: options.wavePhone,
  });
}
