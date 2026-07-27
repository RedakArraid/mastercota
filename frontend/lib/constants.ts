export const APP_NAME = "Mastercota";
export const APP_TAGLINE = "Cotisez ensemble, facilement";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://mastercota.com";

export const PAYSTACK_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ??
  "pk_test_7ad05dc9dd5951f4463b8fbccea934e102ead21a";

export const DEFAULT_COUNTRY_CODE = "+225";
/** @deprecated utiliser SERVICE_RATE / feesFromNet */
export const COMMISSION_RATE = 0.01;
export const CURRENCY = "FCFA";

export const PAYOUT_PROVIDERS = [
  { name: "Wave Côte d'Ivoire", code: "WAVE_CI", type: "MM" },
  { name: "MTN Côte d'Ivoire", code: "MTN_CI", type: "MM" },
  { name: "Orange Côte d'Ivoire", code: "ORANGE_CI", type: "MM" },
  { name: "Djamo", code: "CI202", type: "Bank" },
  { name: "Ecobank CI", code: "CI059", type: "Bank" },
  { name: "Société Générale CI", code: "CI008", type: "Bank" },
] as const;
