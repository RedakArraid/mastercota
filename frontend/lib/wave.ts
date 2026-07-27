/** Helpers Wave — lien de paiement (auto) + fallback P2P téléphone */

export function digitsOnly(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

export function normalizeWavePhone(phone: string): string | null {
  const d = digitsOnly(phone);
  if (d.length < 8) return null;
  if (phone.trim().startsWith("+")) return `+${d}`;
  if (d.startsWith("225") && d.length >= 13) return `+${d}`;
  if (d.length === 10 && d.startsWith("0")) return `+225${d.slice(1)}`;
  if (d.length === 9) return `+225${d}`;
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

/** Accepte un lien pay.wave.com/m/... */
export function normalizeWavePayLink(raw: string): string | null {
  const t = String(raw || "").trim();
  if (!t) return null;
  try {
    const url = new URL(t.startsWith("http") ? t : `https://${t}`);
    if (!url.hostname.endsWith("wave.com")) return null;
    if (!url.pathname.includes("/m/")) return null;
    // Nettoie query existante ; on rajoutera amount à l’usage
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** URL Wave avec montant prérempli (fonctionne sur les liens marchands / recevoir). */
export function wavePayUrlWithAmount(payLink: string, amount: number): string {
  const base = normalizeWavePayLink(payLink) || payLink.replace(/\/$/, "");
  const amt = Math.round(amount);
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}amount=${amt}`;
}

/**
 * Tentatives d’ouverture Wave pour envoi P2P.
 * Aucun schéma public officiel n’est garanti — on enchaîne les meilleurs candidats.
 */
export function waveSendAttemptUrls(phone: string, amount: number): string[] {
  const digits = digitsOnly(phone);
  const amt = Math.round(amount);
  const e164 = phone.startsWith("+") ? `+${digits}` : `+${digits}`;
  return [
    // Intent Android avec extras (best-effort)
    `intent://send/#Intent;scheme=wave;package=com.wave.personal;S.phone=${digits};S.amount=${amt};end`,
    `intent://send?phone=${digits}&amount=${amt}#Intent;scheme=wave;package=com.wave.personal;end`,
    // Schémas custom éventuels
    `wave://send?phone=${digits}&amount=${amt}`,
    `wave://send?recipient=${encodeURIComponent(e164)}&amount=${amt}`,
    `wave://transfer?phone=${digits}&amount=${amt}`,
    // Fallback : ouvrir l’app
    `intent://#Intent;scheme=wave;package=com.wave.personal;end`,
    "wave://",
  ];
}

export function wavePaymentInstructions(options: {
  wavePhone: string;
  amount: number;
  cotisationTitle: string;
  wavePayLink?: string | null;
}) {
  const display = formatWaveDisplay(options.wavePhone);
  const amountStr = Math.round(options.amount).toLocaleString("fr-FR");
  const autoUrl = options.wavePayLink
    ? wavePayUrlWithAmount(options.wavePayLink, options.amount)
    : null;
  return {
    wavePhone: options.wavePhone,
    wavePhoneDisplay: display,
    wavePhoneDigits: digitsOnly(options.wavePhone),
    amount: Math.round(options.amount),
    amountLabel: `${amountStr} FCFA`,
    autoPayUrl: autoUrl,
    copyText:
      `Envoyez ${amountStr} FCFA via Wave au ${display}\n` +
      `Cotisation : ${options.cotisationTitle}`,
  };
}

/** Copie puis ouvre Wave (autant que le navigateur le permet). */
export async function launchWavePayment(options: {
  amount: number;
  wavePhone?: string | null;
  wavePayLink?: string | null;
}): Promise<{ mode: "link" | "p2p" }> {
  const amt = Math.round(options.amount);

  // 1) Lien de paiement Wave = vrai automatisme (montant prérempli)
  if (options.wavePayLink) {
    const url = wavePayUrlWithAmount(options.wavePayLink, amt);
    window.location.href = url;
    return { mode: "link" };
  }

  // 2) Fallback P2P : copie numéro puis montant, ouvre l’app
  const phone = options.wavePhone;
  if (!phone) throw new Error("Aucun moyen Wave configuré");

  const digits = digitsOnly(phone);
  try {
    await navigator.clipboard.writeText(digits);
  } catch {
    /* ignore */
  }

  const urls = waveSendAttemptUrls(phone, amt);
  // Première tentative sync (souvent bloquée si popup) — navigation directe
  window.location.href = urls[0];

  // Sur mobile, si l’intent échoue, certains navigateurs restent sur la page :
  // on enchaîne d’autres schémas après un court délai.
  let i = 1;
  const timer = window.setInterval(() => {
    if (i >= Math.min(urls.length, 4)) {
      window.clearInterval(timer);
      return;
    }
    const a = document.createElement("a");
    a.href = urls[i];
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    i += 1;
  }, 600);

  window.setTimeout(() => window.clearInterval(timer), 3000);

  // Après ouverture, le montant est aussi mis au presse-papiers pour collage rapide
  window.setTimeout(async () => {
    try {
      await navigator.clipboard.writeText(String(amt));
    } catch {
      /* ignore */
    }
  }, 1500);

  return { mode: "p2p" };
}
