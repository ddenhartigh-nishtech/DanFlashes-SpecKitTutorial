/**
 * Fake scarcity (004 US1, R2–R3). Pure: there is no inventory, so the stock line is copy, decided
 * from the shirt and the switch alone. There is always only 1 left, until he's bought one.
 */

export type StockLine = "scarce" | "again" | "plenty";

/** What a shirt's stock line says, or null when there's nothing to say (switch off, or retired). */
export function stockLine(
  shirt: { isBland: boolean; active: boolean; boughtBefore: boolean },
  on: boolean,
): StockLine | null {
  if (!on || !shirt.active) return null;
  if (shirt.isBland) return "plenty";
  return shirt.boughtBefore ? "again" : "scarce";
}

/** An add or a raise that "finds another one": the quantity went up on a non-bland shirt. */
export function foundAnother(
  change: { previous: number; next: number; isBland: boolean },
  on: boolean,
): boolean {
  return on && !change.isBland && change.next > change.previous;
}
