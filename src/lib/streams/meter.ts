/**
 * The per diem meter (003 US2, R5). Pure, exact money. A running balance, replayed in time order:
 * each top-off adds, each order subtracts, and it never goes below $0.00 at any point. Spending past
 * $0 came out of other money (a card, a top-up), so it isn't held against the next top-off, which
 * refills the meter by its whole amount (US2 AC4).
 */
import { add, cmp, sub, ZERO, type Usd } from "@/lib/money";

export interface PerDiemEvent {
  /** ISO-8601 UTC: a top-off's due time, or an order's time. */
  at: string;
  kind: "payday" | "order";
  amountUsd: Usd;
}

const atLeastZero = (amount: Usd): Usd => (cmp(amount, ZERO) > 0 ? amount : ZERO);

export function perDiemLeft(events: readonly PerDiemEvent[]): Usd {
  // At the same instant a top-off lands first: settlement always runs before an order is placed.
  const ordered = [...events].sort((a, b) =>
    a.at === b.at ? (a.kind === b.kind ? 0 : a.kind === "payday" ? -1 : 1) : a.at < b.at ? -1 : 1,
  );
  return ordered.reduce<Usd>(
    (left, e) =>
      e.kind === "payday" ? add(left, e.amountUsd) : atLeastZero(sub(left, e.amountUsd)),
    ZERO,
  );
}

/** What's left after one more order, never below $0.00. */
export const afterOrder = (left: Usd, totalUsd: Usd): Usd => atLeastZero(sub(left, totalUsd));

/** The order that takes the meter from above $0 to $0 is the one that gets the party. */
export function crossedToZero(before: Usd, after: Usd): boolean {
  return cmp(before, ZERO) > 0 && cmp(after, ZERO) === 0;
}
