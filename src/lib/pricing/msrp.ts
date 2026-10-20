/**
 * The MSRP algorithm (constitution II, 010 research R1): a straight line in the owner-assigned
 * complexity score, owner-tunable, deterministic, strictly increasing, exact to the cent, with no
 * ceiling.
 *
 *   msrp(score) = base price + price per point × score
 */
import { sortTiers } from "@/lib/catalog/tiers";
import type { MsrpSettings, Tier } from "@/lib/catalog/types";
import { add, mul, type Usd } from "@/lib/money";

export const DEFAULT_MSRP_SETTINGS: MsrpSettings = {
  basePriceUsd: "50.00",
  perPointUsd: "25.00",
};

export function msrpUsd(score: number, settings: MsrpSettings): Usd {
  if (!Number.isInteger(score) || score < 0) {
    throw new RangeError(`Complexity score must be a non-negative integer, got ${score}`);
  }
  return add(settings.basePriceUsd, mul(settings.perPointUsd, score));
}

/**
 * What a real shirt starts at (constitution III, 010 R4): the MSRP where the first tier above
 * BLAND begins. Null when BLAND is the only tier, since there's no real shirt to undercut.
 */
export function realShirtStartUsd(tiers: readonly Tier[], settings: MsrpSettings): Usd | null {
  const firstReal = sortTiers(tiers)[1];
  return firstReal ? msrpUsd(firstReal.minScore, settings) : null;
}
