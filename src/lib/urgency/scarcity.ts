/**
 * Fake scarcity (004 US1, R2–R3). Pure: there is no inventory, so the stock line is copy, decided
 * from the shirt and the switch alone. There is always only 1 left, until he's bought one. A
 * one-of-a-kind shirt (007 FR-026) has nothing to run out of: it's made to order, just for him.
 */

export type StockLine = "scarce" | "again" | "few" | "plenty" | "made" | "madeMany";

/** What a shirt's stock line says, or null when there's nothing to say (switch off, or retired). */
export function stockLine(
  shirt: { isBland: boolean; active: boolean; boughtBefore: boolean; madeToOrder?: boolean },
  on: boolean,
): StockLine | null {
  if (!on || !shirt.active) return null;
  if (shirt.madeToOrder) return "made";
  if (shirt.isBland) return "plenty";
  return shirt.boughtBefore ? "again" : "scarce";
}

/**
 * A cart line holding more than one can't still be the last one: Dan found a few more (owner,
 * 2026-10-16). One in the cart keeps its line, and a bland shirt still has plenty.
 */
export function cartStockLine(line: StockLine | null, quantity: number): StockLine | null {
  if (quantity > 1 && line === "made") return "madeMany";
  return quantity > 1 && (line === "scarce" || line === "again") ? "few" : line;
}

/** An add that "finds another one": the quantity went up on a non-bland shirt. */
export function foundAnother(
  change: { previous: number; next: number; isBland: boolean; madeToOrder?: boolean },
  on: boolean,
): boolean {
  return on && !change.isBland && !change.madeToOrder && change.next > change.previous;
}

/** A made-to-order add doesn't find another one: Dan's people will make another (007 FR-026). */
export function makesAnother(
  change: { previous: number; next: number; madeToOrder?: boolean },
  on: boolean,
): boolean {
  return on && Boolean(change.madeToOrder) && change.next > change.previous;
}
