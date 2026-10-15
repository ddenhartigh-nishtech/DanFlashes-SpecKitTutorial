/**
 * The fake-purchase pop-ups' schedule (004 US3, R6). Pure: the client component supplies the clock,
 * the randomness and whether the tab is visible.
 */

export const POP_MIN_MS = 20_000;
export const POP_MAX_MS = 40_000;
/** How long a pop-up stays up before it slides away on its own. */
export const POP_SHOW_MS = 6_000;

/** 20–40 s until the next one, for `rand` in [0, 1). */
export const nextDelay = (rand: number): number =>
  POP_MIN_MS + Math.round(Math.min(Math.max(rand, 0), 1) * (POP_MAX_MS - POP_MIN_MS));

/** When the next one is due, after a pop-up ends or is closed: closing one never stops the next. */
export const scheduleNext = (now: number, rand: number): number => now + nextDelay(rand);

/** Due when it's time and the tab is visible: a hidden tab never piles them up. */
export function popDue({
  now,
  nextAt,
  visible,
}: {
  now: number;
  nextAt: number;
  visible: boolean;
}) {
  return visible && now >= nextAt;
}

export interface PopShirt {
  name: string;
  slug: string;
}

const pick = <T>(items: readonly T[], rand: number): T =>
  items[Math.min(items.length - 1, Math.floor(Math.max(rand, 0) * items.length))];

/** A coworker and a shirt to brag about, or null when there's no shirt to name. */
export function pickPop<C>(
  candidates: readonly PopShirt[],
  cast: readonly C[],
  randShirt: number,
  randCoworker: number,
): { shirt: PopShirt; coworker: C } | null {
  if (candidates.length === 0 || cast.length === 0) return null;
  return { shirt: pick(candidates, randShirt), coworker: pick(cast, randCoworker) };
}
