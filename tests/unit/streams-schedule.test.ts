import { describe, expect, it } from "vitest";
import { duePayments } from "@/lib/streams/schedule";

const MIN = 60_000;
const t = (minutes: number) => new Date(Date.UTC(2026, 9, 14, 12, 0) + minutes * MIN).toISOString();
const at = (minutes: number) => new Date(t(minutes));

describe("duePayments — recurring", () => {
  it("pays at the start and then every period up to now", () => {
    expect(
      duePayments({
        schedule: "recurring",
        nextDueAt: t(0),
        endsAt: null,
        now: at(12),
        periodMs: 5 * MIN,
        cap: 30,
      }),
    ).toEqual({ dueAt: [t(0), t(5), t(10)], nextDueAt: t(15) });
  });

  it("stops at the end and is then finished", () => {
    expect(
      duePayments({
        schedule: "recurring",
        nextDueAt: t(0),
        endsAt: t(12),
        now: at(60),
        periodMs: 5 * MIN,
        cap: 30,
      }),
    ).toEqual({ dueAt: [t(0), t(5), t(10)], nextDueAt: null });
  });

  it("pays a tick that lands exactly on the end", () => {
    expect(
      duePayments({
        schedule: "recurring",
        nextDueAt: t(0),
        endsAt: t(10),
        now: at(10),
        periodMs: 5 * MIN,
        cap: 30,
      }).dueAt,
    ).toEqual([t(0), t(5), t(10)]);
  });

  it("pays nothing before a future start", () => {
    expect(
      duePayments({
        schedule: "recurring",
        nextDueAt: t(30),
        endsAt: null,
        now: at(10),
        periodMs: 5 * MIN,
        cap: 30,
      }),
    ).toEqual({ dueAt: [], nextDueAt: t(30) });
  });

  it("pays at most the cap, then resumes after the last paid tick", () => {
    const first = duePayments({
      schedule: "recurring",
      nextDueAt: t(0),
      endsAt: null,
      now: at(100),
      periodMs: MIN,
      cap: 30,
    });
    expect(first.dueAt).toHaveLength(30);
    expect(first.dueAt.at(-1)).toBe(t(29));
    expect(first.nextDueAt).toBe(t(30));
  });

  it("applies a changed period from the stored next payment on", () => {
    expect(
      duePayments({
        schedule: "recurring",
        nextDueAt: t(10),
        endsAt: null,
        now: at(20),
        periodMs: 2 * MIN,
        cap: 30,
      }),
    ).toEqual({ dueAt: [t(10), t(12), t(14), t(16), t(18), t(20)], nextDueAt: t(22) });
  });
});

describe("duePayments — one time and whenever", () => {
  it("pays a one-time stream once at its start, then never again", () => {
    expect(
      duePayments({
        schedule: "one_time",
        nextDueAt: t(0),
        endsAt: null,
        now: at(90),
        periodMs: 5 * MIN,
        cap: 30,
      }),
    ).toEqual({ dueAt: [t(0)], nextDueAt: null });
    expect(
      duePayments({
        schedule: "one_time",
        nextDueAt: t(30),
        endsAt: null,
        now: at(10),
        periodMs: 5 * MIN,
        cap: 30,
      }),
    ).toEqual({ dueAt: [], nextDueAt: t(30) });
  });

  it("never schedules a whenever stream, and a finished stream stays finished", () => {
    for (const schedule of ["whenever", "recurring", "one_time"] as const) {
      expect(
        duePayments({
          schedule,
          nextDueAt: null,
          endsAt: null,
          now: at(90),
          periodMs: MIN,
          cap: 30,
        }),
      ).toEqual({ dueAt: [], nextDueAt: null });
    }
  });
});
