/**
 * Drain them all (003 US4, R12). Pure, exact money. Every stream payment is a lot of money; every
 * order, by any payment method, spends against those lots in time order. The per diem that was
 * connected at the time goes first, then the oldest money. Spending past every lot came out of other
 * money (a card, a top-up), so nothing is ever owed to the next payment. One engine feeds the per
 * diem gauge, each stream's "left" and the achievements, so they can't disagree.
 */
import { add, cmp, sub, ZERO, type Usd } from "@/lib/money";

/** One stream payment. Lots at the same instant are older in the order given (entry id). */
export interface Lot {
  streamId: number;
  /** ISO-8601 UTC: the payment's due time. */
  at: string;
  amountUsd: Usd;
}

/** One order: its time and total. */
export interface Spend {
  at: string;
  amountUsd: Usd;
}

/** When a per diem was his current one: from its start until he disconnected it. */
export interface PerDiemWindow {
  streamId: number;
  from: string;
  until: string | null;
}

export interface StreamHistory {
  lots: readonly Lot[];
  spends: readonly Spend[];
  perDiems: readonly PerDiemWindow[];
}

/** The per diem connected at that moment, if any. */
export function perDiemAt(perDiems: readonly PerDiemWindow[], at: string): number | null {
  return perDiems.find((p) => p.from <= at && (p.until === null || at < p.until))?.streamId ?? null;
}

// Array.prototype.sort is stable, so equal times keep the order they were given in.
const byTime = <T extends { at: string }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

/** One order against what's left (oldest first): the per diem's money, then the oldest. */
function spendFrom(pool: Lot[], spend: Spend, first: number | null): void {
  let owed = spend.amountUsd;
  const take = (lot: Lot) => {
    if (cmp(owed, ZERO) <= 0 || cmp(lot.amountUsd, ZERO) <= 0) return;
    const taken = cmp(lot.amountUsd, owed) < 0 ? lot.amountUsd : owed;
    lot.amountUsd = sub(lot.amountUsd, taken);
    owed = sub(owed, taken);
  };
  pool.filter((lot) => lot.streamId === first).forEach(take);
  pool.filter((lot) => lot.streamId !== first).forEach(take);
}

/** What's left of every lot, oldest first. A lot lands before an order at the same instant. */
function replay({ lots, spends, perDiems }: StreamHistory): Lot[] {
  const arriving = byTime(lots);
  const pool: Lot[] = [];
  let next = 0;
  for (const spend of byTime(spends)) {
    while (next < arriving.length && arriving[next].at <= spend.at) {
      pool.push({ ...arriving[next++] });
    }
    spendFrom(pool, spend, perDiemAt(perDiems, spend.at));
  }
  pool.push(...arriving.slice(next).map((lot) => ({ ...lot })));
  return pool;
}

function totalByStream(pool: readonly Lot[]): Map<number, Usd> {
  const left = new Map<number, Usd>();
  for (const lot of pool)
    left.set(lot.streamId, add(left.get(lot.streamId) ?? ZERO, lot.amountUsd));
  return left;
}

/** What's left of each stream that has paid anything, oldest money first. Never below $0.00. */
export function leftByStream(history: StreamHistory): Map<number, Usd> {
  return totalByStream(replay(history));
}

/** The streams one more order would take from above $0 to $0, oldest money first. */
export function drainedBy(history: StreamHistory, spend: Spend): number[] {
  const before = leftByStream(history);
  const after = leftByStream({ ...history, spends: [...history.spends, spend] });
  return [...before]
    .filter(([id, left]) => cmp(left, ZERO) > 0 && cmp(after.get(id) ?? ZERO, ZERO) === 0)
    .map(([id]) => id);
}
