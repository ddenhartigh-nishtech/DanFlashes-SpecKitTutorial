/**
 * Revenue streams (003 US1). The only module that writes `revenue_streams` rows or "stream" Flash
 * Credit entries. Recurring and one-time payments are settled lazily, whenever his money is shown
 * (R2), and each is credited exactly once: the unique (stream_id, stream_payment_no) index makes a
 * duplicate impossible, not just unlikely (R1).
 */
import { and, asc, desc, eq, isNotNull, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import { copy } from "@/lib/copy";
import type { Db } from "@/lib/db/client";
import type { StoreSettings } from "@/lib/catalog/types";
import { flashCreditEntries, orders, revenueStreams } from "@/lib/db/schema";
import { cmp, ZERO, type Usd } from "@/lib/money";
import type { Err, Ok } from "@/lib/result";
import {
  drainedBy,
  leftByStream,
  perDiemAt,
  type Lot,
  type Spend,
  type StreamHistory,
} from "@/lib/streams/allocation";
import { duePayments } from "@/lib/streams/schedule";
import {
  CATCH_UP_CAP,
  PER_DIEM,
  type StreamPreset,
  type StreamSchedule,
} from "@/lib/streams/types";
import { validateConnectInput, type ConnectError, type ConnectInput } from "@/lib/streams/validate";

type StreamRow = typeof revenueStreams.$inferSelect;

export interface StreamView {
  id: number;
  name: string;
  isPerDiem: boolean;
  amountUsd: Usd;
  schedule: StreamSchedule;
  /** A recurring top-off's own interval; null for the other schedules. */
  intervalMinutes: number | null;
  startsAt: string;
  endsAt: string | null;
  nextDueAt: string | null;
  paymentsMade: number;
  /** What a "Cash in" press pays as (R4). */
  nextPaymentNo: number;
  connected: boolean;
  ended: boolean;
  /** A scheduled stream that has made every payment it ever will. */
  done: boolean;
  /** A connected "whenever" stream inside its window. */
  cashable: boolean;
  /** Recurring and "whenever" streams can be stopped; a one-time stream was applied and is done. */
  canDisconnect: boolean;
}

export function streamName(row: {
  preset: StreamPreset | null;
  customName: string | null;
}): string {
  return row.preset ? copy.streams.presets[row.preset] : (row.customName ?? "");
}

const isEnded = (row: StreamRow, now: Date) =>
  row.endsAt !== null && Date.parse(row.endsAt) <= now.getTime();

function toView(row: StreamRow, now: Date): StreamView {
  const connected = row.disconnectedAt === null;
  const ended = isEnded(row, now);
  const started = Date.parse(row.startsAt) <= now.getTime();
  return {
    id: row.id,
    name: streamName(row),
    isPerDiem: row.preset === PER_DIEM,
    amountUsd: row.amountUsd,
    schedule: row.schedule,
    intervalMinutes: row.intervalMinutes,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    nextDueAt: row.nextDueAt,
    paymentsMade: row.paymentsMade,
    nextPaymentNo: row.paymentsMade + 1,
    connected,
    ended,
    done: row.schedule !== "whenever" && row.nextDueAt === null && row.paymentsMade > 0,
    cashable: connected && row.schedule === "whenever" && started && !ended,
    canDisconnect: connected && row.schedule !== "one_time",
  };
}

/**
 * Credit every recurring or one-time payment that has come due, oldest first, at most
 * CATCH_UP_CAP per stream per call. Returns how many came due. Cheap when nothing is due: one read,
 * no write transaction. Inside another transaction (placeOrder) it runs as a savepoint of it.
 */
export function settleStreams(db: Db, userId: number, now: Date = new Date()): number {
  const due = and(
    eq(revenueStreams.userId, userId),
    isNull(revenueStreams.disconnectedAt),
    isNotNull(revenueStreams.nextDueAt),
    lte(revenueStreams.nextDueAt, now.toISOString()),
  );
  if (!db.select({ id: revenueStreams.id }).from(revenueStreams).where(due).get()) return 0;

  return db.transaction(
    () => {
      let paid = 0;
      for (const row of db
        .select()
        .from(revenueStreams)
        .where(due)
        .orderBy(asc(revenueStreams.id))
        .all()) {
        const { dueAt, nextDueAt } = duePayments({
          schedule: row.schedule,
          nextDueAt: row.nextDueAt,
          endsAt: row.endsAt,
          now,
          // Each recurring top-off pays on its own interval (owner, 2026-10-14).
          periodMs: Math.max(1, row.intervalMinutes ?? 1) * 60_000,
          cap: CATCH_UP_CAP,
        });
        dueAt.forEach((createdAt, i) => {
          db.insert(flashCreditEntries)
            .values({
              userId,
              amountUsd: row.amountUsd,
              kind: "stream",
              streamId: row.id,
              streamPaymentNo: row.paymentsMade + i + 1,
              createdAt, // the payment's due time, so the history reads in true order
            })
            .onConflictDoNothing()
            .run();
        });
        db.update(revenueStreams)
          .set({ paymentsMade: row.paymentsMade + dueAt.length, nextDueAt })
          .where(eq(revenueStreams.id, row.id))
          .run();
        paid += dueAt.length;
      }
      return paid;
    },
    { behavior: "immediate" },
  );
}

export function connectStream(
  db: Db,
  userId: number,
  input: ConnectInput,
  now: Date = new Date(),
): Ok<{ streamId: number }> | Err<ConnectError | "PER_DIEM_EXISTS"> {
  const valid = validateConnectInput(input, now);
  if (!valid.ok) return valid;
  const stream = valid.value;

  return db.transaction(
    (): Ok<{ streamId: number }> | Err<"PER_DIEM_EXISTS"> => {
      // Pay anything already due first, so superseding an ended per diem never loses a payday.
      settleStreams(db, userId, now);
      if (stream.preset === PER_DIEM) {
        const current = db
          .select()
          .from(revenueStreams)
          .where(
            and(
              eq(revenueStreams.userId, userId),
              eq(revenueStreams.preset, PER_DIEM),
              isNull(revenueStreams.disconnectedAt),
            ),
          )
          .get();
        if (current && !isEnded(current, now)) return { ok: false, code: "PER_DIEM_EXISTS" };
        if (current) {
          db.update(revenueStreams)
            .set({ disconnectedAt: now.toISOString(), nextDueAt: null })
            .where(eq(revenueStreams.id, current.id))
            .run();
        }
      }
      const { id } = db
        .insert(revenueStreams)
        .values({
          userId,
          ...stream,
          nextDueAt: stream.schedule === "whenever" ? null : stream.startsAt,
        })
        .returning({ id: revenueStreams.id })
        .get();
      settleStreams(db, userId, now); // a stream that starts now pays its first payday right away
      return { ok: true, streamId: id };
    },
    { behavior: "immediate" },
  );
}

export function disconnectStream(
  db: Db,
  userId: number,
  streamId: number,
  now: Date = new Date(),
): Ok | Err<"STREAM_NOT_FOUND"> {
  return db.transaction(
    (): Ok | Err<"STREAM_NOT_FOUND"> => {
      settleStreams(db, userId, now); // what came due while connected is his
      const row = db
        .select({ id: revenueStreams.id })
        .from(revenueStreams)
        .where(
          and(
            eq(revenueStreams.id, streamId),
            eq(revenueStreams.userId, userId),
            isNull(revenueStreams.disconnectedAt),
            ne(revenueStreams.schedule, "one_time"), // already applied; nothing left to stop
          ),
        )
        .get();
      if (!row) return { ok: false, code: "STREAM_NOT_FOUND" };
      db.update(revenueStreams)
        .set({ disconnectedAt: now.toISOString(), nextDueAt: null })
        .where(eq(revenueStreams.id, row.id))
        .run();
      return { ok: true };
    },
    { behavior: "immediate" },
  );
}

/**
 * One "Cash in" press (R4). `paymentNo` is the number the page rendered, so a double press or a
 * replayed request finds it already paid and changes nothing.
 */
export function cashIn(
  db: Db,
  userId: number,
  input: { streamId: number; paymentNo: number; now?: Date },
): Ok | Err<"STREAM_NOT_FOUND" | "NOT_CASHABLE"> {
  const now = input.now ?? new Date();
  return db.transaction(
    (): Ok | Err<"STREAM_NOT_FOUND" | "NOT_CASHABLE"> => {
      const row = db
        .select()
        .from(revenueStreams)
        .where(and(eq(revenueStreams.id, input.streamId), eq(revenueStreams.userId, userId)))
        .get();
      if (!row) return { ok: false, code: "STREAM_NOT_FOUND" };
      if (!toView(row, now).cashable) return { ok: false, code: "NOT_CASHABLE" };
      if (input.paymentNo <= row.paymentsMade) return { ok: true };
      if (input.paymentNo !== row.paymentsMade + 1) return { ok: false, code: "NOT_CASHABLE" };
      db.insert(flashCreditEntries)
        .values({
          userId,
          amountUsd: row.amountUsd,
          kind: "stream",
          streamId: row.id,
          streamPaymentNo: input.paymentNo,
          createdAt: now.toISOString(),
        })
        .run();
      db.update(revenueStreams)
        .set({ paymentsMade: input.paymentNo })
        .where(eq(revenueStreams.id, row.id))
        .run();
      return { ok: true };
    },
    { behavior: "immediate" },
  );
}

/** His streams for the account: connected first, newest first. */
export function listStreams(db: Db, userId: number, now: Date = new Date()): StreamView[] {
  return db
    .select()
    .from(revenueStreams)
    .where(eq(revenueStreams.userId, userId))
    .orderBy(sql`${revenueStreams.disconnectedAt} IS NOT NULL`, desc(revenueStreams.id))
    .all()
    .map((row) => toView(row, now));
}

/** Everything the allocation engine replays for him (R12): stream payments, orders, per diems. */
function streamHistory(db: Db, userId: number): StreamHistory {
  const lots = db
    .select({
      streamId: flashCreditEntries.streamId,
      at: flashCreditEntries.createdAt,
      amountUsd: flashCreditEntries.amountUsd,
    })
    .from(flashCreditEntries)
    .where(and(eq(flashCreditEntries.userId, userId), eq(flashCreditEntries.kind, "stream")))
    .orderBy(asc(flashCreditEntries.id))
    .all() as Lot[]; // a stream entry always has its stream (CHECK)
  const spends = db
    .select({ at: orders.createdAt, amountUsd: orders.totalUsd })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(asc(orders.id))
    .all();
  const perDiems = db
    .select({
      streamId: revenueStreams.id,
      from: revenueStreams.startsAt,
      until: revenueStreams.disconnectedAt,
    })
    .from(revenueStreams)
    .where(and(eq(revenueStreams.userId, userId), eq(revenueStreams.preset, PER_DIEM)))
    .all();
  return { lots, spends, perDiems };
}

export interface PerDiemMeter {
  streamId: number;
  leftUsd: Usd;
  /** At $0.00 after paying in: the achievement state. */
  drained: boolean;
  /** Its payment count: what the GONE's (x) clears (R13). */
  paymentNo: number;
  /** He cleared this drain's GONE (R13). The countdown itself can't be cleared. */
  dismissed: boolean;
}

/**
 * His per diem left (003 FR-013): the connected per diem's payments, less every order since, by any
 * payment method, spent before any other money and never below $0.00. Null while the drain is off
 * or with no per diem. Reads only; callers settle first so a top-off that came due is counted.
 */
export function getPerDiemMeter(
  db: Db,
  userId: number,
  settings: StoreSettings,
): PerDiemMeter | null {
  if (!settings.perDiemDrain) return null;
  const stream = db
    .select({
      id: revenueStreams.id,
      paymentsMade: revenueStreams.paymentsMade,
      dismissedDrainPaymentNo: revenueStreams.dismissedDrainPaymentNo,
    })
    .from(revenueStreams)
    .where(
      and(
        eq(revenueStreams.userId, userId),
        eq(revenueStreams.preset, PER_DIEM),
        isNull(revenueStreams.disconnectedAt),
      ),
    )
    .get();
  if (!stream) return null;
  const left = leftByStream(streamHistory(db, userId));
  const leftUsd = left.get(stream.id) ?? ZERO;
  const drained = left.has(stream.id) && cmp(leftUsd, ZERO) === 0;
  return {
    streamId: stream.id,
    leftUsd,
    drained,
    paymentNo: stream.paymentsMade,
    dismissed: drained && stream.dismissedDrainPaymentNo === stream.paymentsMade,
  };
}

export interface DrainPop {
  streamId: number;
  name: string;
  /** Its payment count: what the (x) clears (R13). */
  paymentNo: number;
}

/**
 * The GONE pops in the corner (003 FR-029, R13): every stream but a per diem that has paid in and is
 * spent to $0.00, connected or not, oldest stream first, unless he cleared that drain. Null while
 * the drain is off. Reads only; callers settle first.
 */
export function getDrainPops(db: Db, userId: number, settings: StoreSettings): DrainPop[] | null {
  if (!settings.perDiemDrain) return null;
  const left = leftByStream(streamHistory(db, userId));
  return db
    .select()
    .from(revenueStreams)
    .where(eq(revenueStreams.userId, userId))
    .orderBy(asc(revenueStreams.id))
    .all()
    .filter(
      (row) =>
        row.preset !== PER_DIEM && // the current one is the gauge; an old one left with it
        left.has(row.id) &&
        cmp(left.get(row.id)!, ZERO) === 0 &&
        row.dismissedDrainPaymentNo !== row.paymentsMade,
    )
    .map((row) => ({ streamId: row.id, name: streamName(row), paymentNo: row.paymentsMade }));
}

/**
 * The (x) on a GONE (003 FR-030, R13). `paymentNo` is the payment count the page rendered, so a
 * payday that lands before the click makes a new drain that still pops. The highest one cleared wins.
 */
export function dismissDrain(
  db: Db,
  userId: number,
  input: { streamId: number; paymentNo: number },
): Ok | Err<"STREAM_NOT_FOUND"> {
  const row = db
    .select({ id: revenueStreams.id, paymentsMade: revenueStreams.paymentsMade })
    .from(revenueStreams)
    .where(and(eq(revenueStreams.id, input.streamId), eq(revenueStreams.userId, userId)))
    .get();
  if (!row || input.paymentNo < 1 || input.paymentNo > row.paymentsMade) {
    return { ok: false, code: "STREAM_NOT_FOUND" };
  }
  db.update(revenueStreams)
    .set({ dismissedDrainPaymentNo: input.paymentNo })
    .where(
      and(
        eq(revenueStreams.id, row.id),
        or(
          isNull(revenueStreams.dismissedDrainPaymentNo),
          lt(revenueStreams.dismissedDrainPaymentNo, input.paymentNo),
        ),
      ),
    )
    .run();
  return { ok: true };
}

/**
 * What's left of each of his streams that has paid anything (003 FR-025), by stream id. Null while
 * the drain is off. Reads only; callers settle first.
 */
export function getStreamBalances(
  db: Db,
  userId: number,
  settings: StoreSettings,
): Map<number, Usd> | null {
  return settings.perDiemDrain ? leftByStream(streamHistory(db, userId)) : null;
}

export interface Drains {
  /** The order empties the per diem connected when it's placed (orders.per_diem_drained). */
  perDiem: boolean;
  /** Every other stream it empties (order_drains), oldest money first. */
  others: number[];
}

/**
 * The streams one more order takes from above $0 to $0 (003 FR-026, FR-027). Nothing while the
 * drain is off (FR-028). Call after settling, before the order is written.
 */
export function streamsDrainedBy(
  db: Db,
  userId: number,
  settings: StoreSettings,
  spend: Spend,
): Drains {
  if (!settings.perDiemDrain) return { perDiem: false, others: [] };
  const history = streamHistory(db, userId);
  const perDiem = perDiemAt(history.perDiems, spend.at);
  const drained = drainedBy(history, spend);
  return {
    perDiem: perDiem !== null && drained.includes(perDiem),
    others: drained.filter((id) => id !== perDiem),
  };
}
