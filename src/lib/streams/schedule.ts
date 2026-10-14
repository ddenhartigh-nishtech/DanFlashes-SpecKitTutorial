/**
 * When stream payments come due (003 R3). Pure: ISO-8601 UTC strings in and out, no clock, no
 * database. Settlement walks `nextDueAt` forward one pay period at a time, using the period in
 * effect now, so a changed period only affects payments still to come.
 */
import type { StreamSchedule } from "@/lib/streams/types";

export interface DueInput {
  schedule: StreamSchedule;
  /** The next scheduled payment, or null once the stream is finished (or never scheduled). */
  nextDueAt: string | null;
  /** Null means ongoing. */
  endsAt: string | null;
  now: Date;
  periodMs: number;
  /** Most payments to return in one call (the catch-up cap). */
  cap: number;
}

export interface DueResult {
  /** Due times to pay now, oldest first. */
  dueAt: string[];
  /** Where the schedule continues afterwards; null when nothing more will ever come due. */
  nextDueAt: string | null;
}

export function duePayments(input: DueInput): DueResult {
  const { schedule, nextDueAt, endsAt, now, periodMs, cap } = input;
  if (schedule === "whenever" || nextDueAt === null) return { dueAt: [], nextDueAt: null };

  const nowMs = now.getTime();
  const firstMs = Date.parse(nextDueAt);
  if (schedule === "one_time") {
    return firstMs <= nowMs ? { dueAt: [nextDueAt], nextDueAt: null } : { dueAt: [], nextDueAt };
  }

  const endMs = endsAt === null ? Infinity : Date.parse(endsAt);
  const dueAt: string[] = [];
  let tick = firstMs;
  while (tick <= nowMs && tick <= endMs && dueAt.length < cap) {
    dueAt.push(new Date(tick).toISOString());
    tick += periodMs;
  }
  return { dueAt, nextDueAt: tick > endMs ? null : new Date(tick).toISOString() };
}
