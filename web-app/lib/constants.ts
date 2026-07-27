export const APP_NAME = "Mastercota";
export const APP_TAGLINE = "Cotisez ensemble, facilement";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://tomtoinewsoktnkrtbbm.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbXRvaW5ld3Nva3Rua3J0YmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTc2ODgsImV4cCI6MjA5NDg5MzY4OH0.Okyz8FNsW8-3TYt-M7UYBkdphtu_IdmEAREFjmgtzsk";

export const PAYSTACK_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ??
  "pk_test_7ad05dc9dd5951f4463b8fbccea934e102ead21a";

export const DEFAULT_COUNTRY_CODE = "+225";
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
