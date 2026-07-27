/** Frais Mastercota + Paystack MoMo CI — aligné sur backend/src/lib/fees.ts */
export const PLATFORM_RATE = 0.01;
export const PAYSTACK_MOMO_RATE = 0.0195;
export const SERVICE_RATE = PLATFORM_RATE + PAYSTACK_MOMO_RATE;
/** Libellé UI (~3 %) */
export const SERVICE_FEE_LABEL = "~3 %";

export type FeeQuote = {
  net: number;
  gross: number;
  fee: number;
};

export function roundUpTo5(n: number): number {
  return Math.ceil(n / 5) * 5;
}

export function feesFromNet(netInput: number): FeeQuote | null {
  const net = Math.round(Number(netInput));
  if (!Number.isFinite(net) || net <= 0) return null;
  const gross = roundUpTo5(net / (1 - SERVICE_RATE));
  return { net, gross, fee: gross - net };
}
