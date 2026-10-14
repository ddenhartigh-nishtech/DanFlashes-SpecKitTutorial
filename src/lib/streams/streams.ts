/**
 * Revenue streams (003 US1). The only module that writes `revenue_streams` rows or "stream" Flash
 * Credit entries. Recurring and one-time payments are settled lazily, whenever his money is shown
 * (R2), and each is credited exactly once: the unique (stream_id, stream_payment_no) index makes a
 * duplicate impossible, not just unlikely (R1).
 */
import { and, asc, desc, eq, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";
import { copy } from "@/lib/copy";
import type { Db } from "@/lib/db/client";
import { flashCreditEntries, revenueStreams } from "@/lib/db/schema";
import type { Usd } from "@/lib/money";
import type { Err, Ok } from "@/lib/result";
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
