import type { MsrpSettings, PricedShirtInput } from "@/lib/catalog/types";
import { isUsdString, type Usd } from "@/lib/money";
import { msrpUsd } from "@/lib/pricing/msrp";

export interface ResolvedPrice {
  /** What the store displays and charges: the owner's price, otherwise the MSRP. */
  finalPriceUsd: Usd;
  msrpUsd: Usd;
}

export function resolvePrice(shirt: PricedShirtInput, settings: MsrpSettings): ResolvedPrice {
  const msrp = msrpUsd(shirt.complexity, settings);
  if (shirt.finalPriceUsd === null) return { finalPriceUsd: msrp, msrpUsd: msrp };
  if (!isUsdString(shirt.finalPriceUsd)) {
    throw new RangeError(`Malformed final price: ${JSON.stringify(shirt.finalPriceUsd)}`);
  }
  return { finalPriceUsd: shirt.finalPriceUsd, msrpUsd: msrp };
}
