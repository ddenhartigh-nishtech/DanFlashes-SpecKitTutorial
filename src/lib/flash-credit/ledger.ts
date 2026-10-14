/**
 * Flash Credit is a ledger (constitution): every top-up, spend, and revenue-stream payment is an entry, the balance is
 * their exact decimal sum (computed here, never with SQL SUM, which would use floats), and it can
 * never go negative.
 */
import { desc, eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { flashCreditEntries, revenueStreams } from "@/lib/db/schema";
import { cmp, sum, tryParseUsd, type Usd } from "@/lib/money";
import { validateFauxCard, type CardErrorCode, type FauxCardInput } from "@/lib/payments/faux-card";
import type { Err, Ok } from "@/lib/result";
import { streamName } from "@/lib/streams/streams";

export function getBalanceUsd(db: Db, userId: number): Usd {
  const rows = db
    .select({ amountUsd: flashCreditEntries.amountUsd })
    .from(flashCreditEntries)
    .where(eq(flashCreditEntries.userId, userId))
    .all();
  return sum(rows.map((r) => r.amountUsd));
}

export type TopUpResult = Ok<{ balanceUsd: Usd }> | Err<"INVALID_AMOUNT" | CardErrorCode>;

/** Load Flash Credit by "charging" a faux card. Any amount ≥ $0.01, dollars and cents. */
export function topUp(
  db: Db,
  userId: number,
  input: { amountInput: string; card: FauxCardInput; now?: Date },
): TopUpResult {
  const amountUsd = tryParseUsd(input.amountInput);
  if (amountUsd === null || cmp(amountUsd, "0.01") < 0)
    return { ok: false, code: "INVALID_AMOUNT" };
  const card = validateFauxCard(input.card, input.now);
  if (!card.ok) return card;
  db.insert(flashCreditEntries)
    .values({ userId, amountUsd, kind: "top_up", cardBrand: card.brand, cardLast4: card.last4 })
    .run();
  return { ok: true, balanceUsd: getBalanceUsd(db, userId) };
}

export interface LedgerEntry {
  id: number;
  kind: "top_up" | "spend" | "stream";
  amountUsd: Usd;
  orderId: number | null;
  cardBrand: string | null;
  cardLast4: string | null;
  /** For "stream" entries: the stream it came from (a preset name, or his own). */
  streamName: string | null;
  createdAt: string;
}

export function listEntries(db: Db, userId: number): LedgerEntry[] {
  return db
    .select({
      id: flashCreditEntries.id,
      kind: flashCreditEntries.kind,
      amountUsd: flashCreditEntries.amountUsd,
      orderId: flashCreditEntries.orderId,
      cardBrand: flashCreditEntries.cardBrand,
      cardLast4: flashCreditEntries.cardLast4,
      preset: revenueStreams.preset,
      customName: revenueStreams.customName,
      createdAt: flashCreditEntries.createdAt,
    })
    .from(flashCreditEntries)
    .leftJoin(revenueStreams, eq(flashCreditEntries.streamId, revenueStreams.id))
    .where(eq(flashCreditEntries.userId, userId))
    .orderBy(desc(flashCreditEntries.createdAt), desc(flashCreditEntries.id))
    .all()
    .map(({ preset, customName, ...entry }) => ({
      ...entry,
      streamName: entry.kind === "stream" ? streamName({ preset, customName }) : null,
    }));
}
