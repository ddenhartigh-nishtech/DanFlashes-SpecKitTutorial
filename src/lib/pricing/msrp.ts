/**
 * The MSRP algorithm (constitution II, research R5): exponential in the owner-assigned complexity
 * score, owner-tunable, deterministic, monotonic, rounded half-up to the cent, with no ceiling.
 *
 *   msrp(score) = startPrice × 2^((score − anchorScore) / doublingInterval)
 */
import type { MsrpSettings } from "@/lib/catalog/types";
import { scaleByFloat, type Usd } from "@/lib/money";

export const DEFAULT_MSRP_SETTINGS: MsrpSettings = {
  startPriceUsd: "300.00",
  anchorScore: 10,
  doublingInterval: 10,
};

export function msrpUsd(score: number, settings: MsrpSettings): Usd {
  if (!Number.isInteger(score) || score < 0) {
    throw new RangeError(`Complexity score must be a non-negative integer, got ${score}`);
  }
  if (!Number.isInteger(settings.doublingInterval) || settings.doublingInterval < 1) {
    throw new RangeError(`Doubling interval must be a positive integer`);
  }
  const factor = 2 ** ((score - settings.anchorScore) / settings.doublingInterval);
  return scaleByFloat(settings.startPriceUsd, factor);
}
