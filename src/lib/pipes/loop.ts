/** The pipes' pace (006 R6): steps by elapsed time, never a burst after a slow frame (FR-018). */

/**
 * Six steps a second fills a desktop screen in about 20 seconds (a phone in about 10), like
 * watching the original. 25 a second cleared the screen every 5 seconds: frantic, not hypnotic.
 */
export const STEPS_PER_SECOND = 6;

/**
 * How many steps `elapsedMs` has earned, and the time carried to the next frame. Past
 * `maxPerFrame`, the backlog is dropped: on a slow device the pipes fall behind, the page doesn't.
 */
export function stepsDue(elapsedMs: number, stepsPerSecond: number, maxPerFrame: number) {
  const interval = 1000 / stepsPerSecond;
  const due = Math.floor(elapsedMs / interval);
  if (due > maxPerFrame) return { steps: maxPerFrame, leftoverMs: 0 };
  return { steps: due, leftoverMs: elapsedMs - due * interval };
}
