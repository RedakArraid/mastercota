/** Helpers Wave P2P (CI) — pas de deep link public fiable avec montant prérempli. */

export function digitsOnly(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

export function normalizeWavePhone(phone: string): string | null {
  const d = digitsOnly(phone);
  if (d.length < 8) return null;
  // E.164-ish storage
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

/** Tentatives d’ouverture de l’app Wave (best-effort). */
export function waveAppOpenUrls(): string[] {
  return [
    "intent://#Intent;scheme=wave;package=com.wave.personal;end",
    "wave://",
    "https://wave.com",
  ];
}

export function wavePaymentInstructions(options: {
  wavePhone: string;
  amount: number;
  cotisationTitle: string;
}) {
  const display = formatWaveDisplay(options.wavePhone);
  const amountStr = Math.round(options.amount).toLocaleString("fr-FR");
  return {
    wavePhone: options.wavePhone,
    wavePhoneDisplay: display,
    wavePhoneDigits: digitsOnly(options.wavePhone),
    amount: Math.round(options.amount),
    amountLabel: `${amountStr} FCFA`,
    copyText:
      `Envoyez ${amountStr} FCFA via Wave au ${display}\n` +
      `Cotisation : ${options.cotisationTitle}`,
  };
}
