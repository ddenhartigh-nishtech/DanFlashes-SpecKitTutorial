/**
 * How far the dial goes (007 FR-004, FR-007, R2). Steps 0–100 run from plain to the most the store
 * can price (or the most the art can hold, whichever comes first), never going down. Step 101 is
 * beyond: too complicated to price, even for Dan.
 */
import type { MsrpSettings } from "@/lib/catalog/types";
import { msrpUsd } from "@/lib/pricing/msrp";

export const DIAL_STEPS = 102;
export const BEYOND = 101;
/**
 * Past this, the art outgrows 2 MB (SC-005): about 1.9 MB here, at 10 drawn points a score point
 * (R13 as amended). Only an extreme tuning reaches it; the default top is 10,249.
 */
export const ART_MAX_SCORE = 24_000;

const priceable = (score: number, msrp: MsrpSettings) => {
  try {
    msrpUsd(score, msrp);
    return true;
  } catch {
    return false;
  }
};

/** The largest whole score the MSRP can price under this tuning. */
export function maxPriceableScore(msrp: MsrpSettings): number {
  if (!priceable(0, msrp)) return -1;
  let lo = 0;
  let hi = 1;
  while (priceable(hi, msrp) && hi < 2 ** 31) {
    lo = hi;
    hi *= 2;
  }
  if (priceable(hi, msrp)) return hi;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (priceable(mid, msrp)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The dial's top: the most the store can price, or the most the art can hold. */
export const maxDialScore = (msrp: MsrpSettings) =>
  Math.max(0, Math.min(maxPriceableScore(msrp), ART_MAX_SCORE));

/**
 * A step's target score: 2.5 points a step up to 200 (every tier gets fine steps), then exponential
 * up to the top. Null at BEYOND.
 */
export function scoreAtStep(step: number, maxDial: number): number | null {
  if (step >= BEYOND) return null;
  if (step >= 100) return maxDial;
  const linear = Math.round(2.5 * Math.max(0, step));
  if (step <= 80 || maxDial <= 200) return Math.min(maxDial, linear);
  return Math.min(maxDial, Math.round(200 * (maxDial / 200) ** ((step - 80) / 20)));
}
