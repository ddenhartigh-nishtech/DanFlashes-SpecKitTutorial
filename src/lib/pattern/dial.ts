/**
 * How far the dial goes (007 FR-004, FR-007, R2; 010 FR-011). Steps 0–100 run from plain to the
 * dial's fixed top, never going down. Step 101 is beyond: too complicated to price, even for Dan.
 */
export const DIAL_STEPS = 102;
export const BEYOND = 101;
/**
 * The dial's top (010 FR-011, R5): a fixed score under any tuning. It's where the old exponential
 * MSRP ran out of numbers at its default tuning, kept when the MSRP became a straight line (which
 * never runs out). The art here is about 785 KB, well inside 007's 2 MB budget (SC-005).
 */
export const DIAL_MAX_SCORE = 10_249;

/** The dial's top, whatever the dials say. */
export const maxDialScore = () => DIAL_MAX_SCORE;

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
