/**
 * FX conversion helpers — currencies are converted via THB as the pivot.
 *  THB ↔ MMK : 1 THB = rate_thb_to_mmk MMK
 *  THB ↔ USD : 1 THB = rate_thb_to_usd USD
 */
export type FxRates = {
  rate_thb_to_mmk: number;
  rate_thb_to_usd: number;
};

export function toTHB(amount: number, currency: string, rates: FxRates): number {
  if (currency === "THB") return amount;
  if (currency === "MMK") {
    if (!rates.rate_thb_to_mmk) return 0;
    return amount / rates.rate_thb_to_mmk;
  }
  if (currency === "USD") {
    if (!rates.rate_thb_to_usd) return 0;
    return amount / rates.rate_thb_to_usd;
  }
  return amount;
}

export function fromTHB(thb: number, target: string, rates: FxRates): number {
  if (target === "THB") return thb;
  if (target === "MMK") return thb * rates.rate_thb_to_mmk;
  if (target === "USD") return thb * rates.rate_thb_to_usd;
  return thb;
}

export function convert(
  amount: number,
  from: string,
  to: string,
  rates: FxRates
): number {
  if (from === to) return amount;
  return fromTHB(toTHB(amount, from, rates), to, rates);
}
