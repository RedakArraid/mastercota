/** Pays où Paystack opère — source : paystack.com/countries */
export type CountryDial = {
  iso: string;
  name: string;
  flag: string;
  dial: string;
  /** Longueur du numéro national (chiffres saisis, hors indicatif) */
  nationalLength: number;
  placeholder: string;
};

export const PAYSTACK_COUNTRIES: CountryDial[] = [
  {
    iso: "CI",
    name: "Côte d'Ivoire",
    flag: "🇨🇮",
    dial: "+225",
    nationalLength: 10,
    placeholder: "0700000000",
  },
  {
    iso: "NG",
    name: "Nigeria",
    flag: "🇳🇬",
    dial: "+234",
    nationalLength: 10,
    placeholder: "8012345678",
  },
  {
    iso: "GH",
    name: "Ghana",
    flag: "🇬🇭",
    dial: "+233",
    nationalLength: 9,
    placeholder: "241234567",
  },
  {
    iso: "KE",
    name: "Kenya",
    flag: "🇰🇪",
    dial: "+254",
    nationalLength: 9,
    placeholder: "712345678",
  },
  {
    iso: "ZA",
    name: "Afrique du Sud",
    flag: "🇿🇦",
    dial: "+27",
    nationalLength: 9,
    placeholder: "821234567",
  },
  {
    iso: "EG",
    name: "Égypte",
    flag: "🇪🇬",
    dial: "+20",
    nationalLength: 10,
    placeholder: "1001234567",
  },
];

export const DEFAULT_COUNTRY_ISO = "CI";

export function getCountryByIso(iso: string): CountryDial {
  return (
    PAYSTACK_COUNTRIES.find((c) => c.iso === iso) ?? PAYSTACK_COUNTRIES[0]
  );
}

export function getCountryByDial(dial: string): CountryDial | undefined {
  const normalized = dial.startsWith("+") ? dial : `+${dial}`;
  return PAYSTACK_COUNTRIES.find((c) => c.dial === normalized);
}

/** Construit un numéro E.164 à partir de l'indicatif et du national. */
export function buildE164(country: CountryDial, national: string): string {
  const digits = national.replace(/\D/g, "");
  return `${country.dial}${digits}`;
}

export function isValidNational(
  country: CountryDial,
  national: string
): boolean {
  const digits = national.replace(/\D/g, "");
  return digits.length === country.nationalLength;
}

export function isoFromE164(e164: string): string | null {
  const digits = e164.replace(/\D/g, "");
  const sorted = [...PAYSTACK_COUNTRIES].sort(
    (a, b) => b.dial.length - a.dial.length
  );
  for (const c of sorted) {
    const dialDigits = c.dial.replace(/\D/g, "");
    if (digits.startsWith(dialDigits)) return c.iso;
  }
  return null;
}

export function nationalFromE164(e164: string, iso?: string): string {
  const digits = e164.replace(/\D/g, "");
  const country = getCountryByIso(iso || isoFromE164(e164) || DEFAULT_COUNTRY_ISO);
  const dialDigits = country.dial.replace(/\D/g, "");
  if (digits.startsWith(dialDigits)) return digits.slice(dialDigits.length);
  return digits;
}
