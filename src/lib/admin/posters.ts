/**
 * The motivational poster on every console page (008 FR-005a, R5): a random one, never the same
 * as the one this browser saw last (remembered in the `df-poster` cookie).
 */
export const POSTER_COOKIE = "df-poster";

/** An index in [0, count), never `last` when `last` is a valid index and there's a choice. */
export function pickPoster(count: number, last: number | null, random: () => number): number {
  const remembered = last !== null && Number.isInteger(last) && last >= 0 && last < count;
  if (count <= 1) return 0;
  if (!remembered) return Math.min(count - 1, Math.floor(random() * count));
  const i = Math.min(count - 2, Math.floor(random() * (count - 1)));
  return i >= last ? i + 1 : i;
}
