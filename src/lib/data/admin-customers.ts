/**
 * Customers, for the console (008 FR-032, FR-033, R14). Read-only: the console never settles a
 * stream payment or changes an account; due payments are credited when the shopper next looks, as
 * always. Money is summed exactly, never with SQL SUM.
 */
import { desc } from "drizzle-orm";
import { getSettings } from "@/lib/data/settings";
import type { Db } from "@/lib/db/client";
import { flashCreditEntries, orders, users } from "@/lib/db/schema";
import { listEntries, type LedgerEntry } from "@/lib/flash-credit/ledger";
import { sum, type Usd } from "@/lib/money";
import { listOrdersForUser, type OrderView } from "@/lib/orders/orders";
import { getStreamBalances, listStreams, type StreamView } from "@/lib/streams/streams";

export interface CustomerRow {
  id: number;
  email: string;
  displayName: string | null;
  joinedAt: string;
  isAdmin: boolean;
  orderCount: number;
  lifetimeSpendUsd: Usd;
  balanceUsd: Usd;
}

export interface CustomerDetail {
  customer: CustomerRow;
  orders: OrderView[];
  entries: LedgerEntry[];
  /** Each stream, with what's left of it (null before it has paid anything). */
  streams: (StreamView & { leftUsd: Usd | null })[];
  /** Every order that earned a drain achievement (003): the per diem, and each other stream. */
  drains: { orderId: number; number: string; perDiem: boolean; streams: string[] }[];
}

/** Every account, newest first, with its totals; `q` matches a name or an email, in any case. */
export function listCustomers(db: Db, { q = "" }: { q?: string }): CustomerRow[] {
  const spend = new Map<number, Usd[]>();
  for (const o of db.select({ userId: orders.userId, totalUsd: orders.totalUsd }).from(orders).all()) {
    if (o.userId !== null) spend.set(o.userId, [...(spend.get(o.userId) ?? []), o.totalUsd]);
  }
  const credit = new Map<number, Usd[]>();
  for (const e of db
    .select({ userId: flashCreditEntries.userId, amountUsd: flashCreditEntries.amountUsd })
    .from(flashCreditEntries)
    .all()) {
    credit.set(e.userId, [...(credit.get(e.userId) ?? []), e.amountUsd]);
  }
  const needle = q.trim().toLowerCase();
  return db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt), desc(users.id))
    .all()
    .filter(
      (u) =>
        !needle ||
        u.email.toLowerCase().includes(needle) ||
        (u.displayName ?? "").toLowerCase().includes(needle),
    )
    .map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      joinedAt: u.createdAt,
      isAdmin: u.isAdmin,
      orderCount: spend.get(u.id)?.length ?? 0,
      lifetimeSpendUsd: sum(spend.get(u.id) ?? []),
      balanceUsd: sum(credit.get(u.id) ?? []),
    }));
}

export function getCustomer(db: Db, id: number, now: Date = new Date()): CustomerDetail | null {
  const customer = listCustomers(db, {}).find((c) => c.id === id);
  if (!customer) return null;
  const orderViews = listOrdersForUser(db, id);
  // What's left of each stream, whatever the drain switch says: the owner always gets to see.
  const left = getStreamBalances(db, id, { ...getSettings(db), perDiemDrain: true }) ?? new Map();
  return {
    customer,
    orders: orderViews,
    entries: listEntries(db, id),
    streams: listStreams(db, id, now).map((s) => ({ ...s, leftUsd: left.get(s.id) ?? null })),
    drains: orderViews
      .filter((o) => o.perDiemDrained || o.drainedStreams.length)
      .map((o) => ({
        orderId: o.id,
        number: o.number,
        perDiem: o.perDiemDrained,
        streams: o.drainedStreams.map((d) => d.name),
      })),
  };
}
