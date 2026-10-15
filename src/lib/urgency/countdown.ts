/**
 * Countdown timers that reset (004 US2, R4). Pure. One 10-minute cycle per browser, counted from a
 * saved anchor time: the time left is always (0, 10:00], so it never expires. At zero it is simply
 * back at the top of the next cycle, and every page and tab reading the same anchor agrees.
 */
import type { StoreSettings } from "@/lib/catalog/types";

export const COUNTDOWN_MS = 600_000;

/** Time left in the current cycle, in ms: in (0, COUNTDOWN_MS], whatever the clock says. */
export function remainingMs(now: number, anchor: number): number {
  const elapsed = (((now - anchor) % COUNTDOWN_MS) + COUNTDOWN_MS) % COUNTDOWN_MS;
  return COUNTDOWN_MS - elapsed;
}

const pad = (n: number, width: number) => String(n).padStart(width, "0");

/** "MM:SS.mmm", fixed width, never negative. */
export function formatCountdown(ms: number): string {
  const t = Math.min(Math.max(Math.floor(ms), 0), COUNTDOWN_MS);
  return `${pad(Math.floor(t / 60_000), 2)}:${pad(Math.floor((t % 60_000) / 1000), 2)}.${pad(t % 1000, 3)}`;
}

/** The deal shows whenever the switch is on; the hold only while the cart has something to hold. */
export function showCountdown(
  settings: Pick<StoreSettings, "countdownTimers">,
  kind: "deal" | "hold",
  cartLines: number,
): boolean {
  return settings.countdownTimers && (kind === "deal" || cartLines > 0);
}
