/** Frais Mastercota + Paystack MoMo CI (HT), passés au contributeur. */
export const PLATFORM_RATE = 0.01;
export const PAYSTACK_MOMO_RATE = 0.0195;
/** Taux total appliqué pour calculer le montant débité. */
export const SERVICE_RATE = PLATFORM_RATE + PAYSTACK_MOMO_RATE; // 2,95 % ≈ ~3 %

export type FeeQuote = {
  /** Montant crédité à la cotisation */
  net: number;
  /** Montant débité chez le contributeur (Paystack) */
  gross: number;
  /** Frais de service globaux (gross − net) */
  fee: number;
};

/** Arrondi supérieur aux 5 FCFA près (montants propres). */
export function roundUpTo5(n: number): number {
  return Math.ceil(n / 5) * 5;
}

/**
 * À partir du montant souhaité dans la cagnotte, calcule ce que paie le contributeur.
 * Formule : gross ≈ net / (1 − serviceRate), arrondi au-dessus par 5.
 */
export function feesFromNet(netInput: number): FeeQuote {
  const net = Math.round(Number(netInput));
  if (!Number.isFinite(net) || net <= 0) {
    throw new Error("Montant invalide");
  }
  const gross = roundUpTo5(net / (1 - SERVICE_RATE));
  return { net, gross, fee: gross - net };
}
