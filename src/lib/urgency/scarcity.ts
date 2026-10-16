/**
 * Fake scarcity (004 US1, R2–R3). Pure: there is no inventory, so the stock line is copy, decided
 * from the shirt and the switch alone. There is always only 1 left, until he's bought one.
 */

export type StockLine = "scarce" | "again" | "few" | "plenty";

/** What a shirt's stock line says, or null when there's nothing to say (switch off, or retired). */
export function stockLine(
  shirt: { isBland: boolean; active: boolean; boughtBefore: boolean },
  on: boolean,
): StockLine | null {
  if (!on || !shirt.active) return null;
  if (shirt.isBland) return "plenty";
  return shirt.boughtBefore ? "again" : "scarce";
}

/**
 * A cart line holding more than one can't still be the last one: Dan found a few more (owner,
 * 2026-10-16). One in the cart keeps its line, and a bland shirt still has plenty.
 */
export function cartStockLine(line: StockLine | null, quantity: number): StockLine | null {
  return quantity > 1 && (line === "scarce" || line === "again") ? "few" : line;
}

/** An add that "finds another one": the quantity went up on a non-bland shirt. */
export function foundAnother(
  change: { previous: number; next: number; isBland: boolean },
  on: boolean,
): boolean {
  return on && !change.isBland && change.next > change.previous;
}
