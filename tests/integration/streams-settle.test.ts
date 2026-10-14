import { describe, expect, it } from "vitest";
import { getBalanceUsd, listEntries } from "@/lib/flash-credit/ledger";
import { sum } from "@/lib/money";
import {
  cashIn,
  connectStream,
  disconnectStream,
  listStreams,
  settleStreams,
} from "@/lib/streams/streams";
import type { ConnectInput } from "@/lib/streams/validate";
import { createSeededTestDb } from "../helpers/db";

const START = new Date("2026-10-14T12:00:00.000Z");
const at = (minutes: number) => new Date(START.getTime() + minutes * 60_000);
const iso = (minutes: number) => at(minutes).toISOString();

const PER_DIEM: ConnectInput = {
  preset: "per_diem",
  customName: "",
  amountUsd: "75.00",
  schedule: "recurring",
  intervalCount: "5",
  intervalUnit: "minutes",
  startsAt: "",
  endsAt: "",
  ongoing: true,
};

function setup() {
  const test = createSeededTestDb();
  const userId = (
    test.sqlite
      .prepare("INSERT INTO users (email, password_hash) VALUES ('dan@x.io', 'h') RETURNING id")
      .get() as { id: number }
  ).id;
  const other = (
    test.sqlite
      .prepare("INSERT INTO users (email, password_hash) VALUES ('doug@x.io', 'h') RETURNING id")
      .get() as { id: number }
  ).id;
  return { ...test, userId, other };
}

const streamEntries = (sqlite: ReturnType<typeof setup>["sqlite"]) =>
  sqlite
    .prepare(
      "SELECT stream_id, stream_payment_no, amount_usd, created_at FROM flash_credit_entries WHERE kind = 'stream' ORDER BY id",
    )
    .all() as {
    stream_id: number;
    stream_payment_no: number;
    amount_usd: string;
    created_at: string;
  }[];

function connect(
  db: ReturnType<typeof setup>["db"],
  userId: number,
  input: Partial<ConnectInput>,
  now = START,
) {
  const result = connectStream(db, userId, { ...PER_DIEM, ...input }, now);
  if (!result.ok) throw new Error(`connect failed: ${result.code}`);
  return result.streamId;
}

describe("connectStream", () => {
  it("pays a recurring or one-time stream that starts now immediately; whenever pays nothing", () => {
    const { db, sqlite, userId } = setup();
    const perDiem = connect(db, userId, {});
    const fund = connect(db, userId, {
      preset: "college_fund",
      schedule: "one_time",
      amountUsd: "2000.00",
    });
    connect(db, userId, {
      preset: "custom",
      customName: "Craig owes me",
      schedule: "whenever",
      amountUsd: "40.00",
    });

    expect(streamEntries(sqlite)).toEqual([
      { stream_id: perDiem, stream_payment_no: 1, amount_usd: "75.00", created_at: iso(0) },
      { stream_id: fund, stream_payment_no: 1, amount_usd: "2000.00", created_at: iso(0) },
    ]);
    expect(getBalanceUsd(db, userId)).toBe("2075.00");
    expect(
      sqlite
        .prepare("SELECT schedule, payments_made, next_due_at FROM revenue_streams ORDER BY id")
        .all(),
    ).toEqual([
      { schedule: "recurring", payments_made: 1, next_due_at: iso(5) },
      { schedule: "one_time", payments_made: 1, next_due_at: null },
      { schedule: "whenever", payments_made: 0, next_due_at: null },
    ]);
  });

  it("passes validation errors through and writes nothing", () => {
    const { db, sqlite, userId } = setup();
    expect(connectStream(db, userId, { ...PER_DIEM, amountUsd: "0.00" }, START)).toEqual({
      ok: false,
      code: "INVALID_STREAM_AMOUNT",
    });
    expect(sqlite.prepare("SELECT count(*) AS n FROM revenue_streams").get()).toEqual({ n: 0 });
  });

  it("allows one running per diem; an ended one is superseded by the next", () => {
    const { db, sqlite, userId } = setup();
    const first = connect(db, userId, { ongoing: false, endsAt: iso(30) });
    expect(connectStream(db, userId, PER_DIEM, at(10))).toEqual({
      ok: false,
      code: "PER_DIEM_EXISTS",
    });

    const second = connect(db, userId, {}, at(40));
    expect(
      sqlite.prepare("SELECT id, disconnected_at FROM revenue_streams ORDER BY id").all(),
    ).toEqual([
      { id: first, disconnected_at: iso(40) },
      { id: second, disconnected_at: null },
    ]);
  });

  it("applies a one-time stream at once, even with a later start asked for", () => {
    const { db, sqlite, userId } = setup();
    const fund = connect(db, userId, {
      preset: "college_fund",
      schedule: "one_time",
      startsAt: iso(60),
      amountUsd: "2000.00",
    });
    expect(streamEntries(sqlite)).toEqual([
      { stream_id: fund, stream_payment_no: 1, amount_usd: "2000.00", created_at: iso(0) },
    ]);
    expect(listStreams(db, userId, START)[0]).toMatchObject({ done: true, canDisconnect: false });
  });

  it("lets other presets and custom streams repeat", () => {
    const { db, userId } = setup();
    connect(db, userId, { preset: "garage_sale", schedule: "whenever" });
    connect(db, userId, { preset: "garage_sale", schedule: "whenever" });
    expect(listStreams(db, userId, START)).toHaveLength(2);
  });
});

describe("settleStreams", () => {
  it("pays each due period exactly once, with its due time, however often it runs", () => {
    const { db, sqlite, userId } = setup();
    const id = connect(db, userId, {});
    expect(settleStreams(db, userId, at(12))).toBe(2);
    expect(settleStreams(db, userId, at(12))).toBe(0);
    expect(settleStreams(db, userId, at(14))).toBe(0);
    expect(
      streamEntries(sqlite).map((e) => [e.stream_id, e.stream_payment_no, e.created_at]),
    ).toEqual([
      [id, 1, iso(0)],
      [id, 2, iso(5)],
      [id, 3, iso(10)],
    ]);
  });

  it("stops at the end of the window", () => {
    const { db, sqlite, userId } = setup();
    connect(db, userId, { ongoing: false, endsAt: iso(12) });
    settleStreams(db, userId, at(600));
    expect(streamEntries(sqlite)).toHaveLength(3);
    expect(sqlite.prepare("SELECT next_due_at FROM revenue_streams").get()).toEqual({
      next_due_at: null,
    });
  });

  it("catches up at most 30 payments per call, oldest first", () => {
    const { db, sqlite, userId } = setup();
    connect(db, userId, {});
    expect(settleStreams(db, userId, at(5 * 100))).toBe(30);
    expect(settleStreams(db, userId, at(5 * 100))).toBe(30);
    const numbers = streamEntries(sqlite).map((e) => e.stream_payment_no);
    expect(numbers).toEqual(Array.from({ length: 61 }, (_, i) => i + 1));
  });

  it("pays each recurring top-off on its own interval", () => {
    const { db, sqlite, userId } = setup();
    const often = connect(db, userId, { preset: "garage_sale", intervalCount: "10" });
    const daily = connect(db, userId, { intervalCount: "1", intervalUnit: "days" });
    settleStreams(db, userId, at(60));
    const paid = (id: number) =>
      streamEntries(sqlite)
        .filter((e) => e.stream_id === id)
        .map((e) => e.created_at);
    expect(paid(often)).toEqual([0, 10, 20, 30, 40, 50, 60].map(iso));
    expect(paid(daily)).toEqual([iso(0)]);
    settleStreams(db, userId, at(24 * 60));
    expect(paid(daily)).toEqual([iso(0), iso(24 * 60)]);
  });

  it("pays a future start nothing until it arrives", () => {
    const { db, sqlite, userId } = setup();
    connect(db, userId, { startsAt: iso(60) });
    expect(settleStreams(db, userId, at(30))).toBe(0);
    expect(settleStreams(db, userId, at(60))).toBe(1);
    expect(streamEntries(sqlite).map((e) => e.created_at)).toEqual([iso(60)]);
  });

  it("stops paying a disconnected stream; past payments stay", () => {
    const { db, sqlite, userId } = setup();
    const id = connect(db, userId, {});
    expect(disconnectStream(db, userId, id, at(1))).toEqual({ ok: true });
    settleStreams(db, userId, at(60));
    expect(streamEntries(sqlite)).toHaveLength(1);
    expect(getBalanceUsd(db, userId)).toBe("75.00");
  });

  it("keeps the balance equal to the history", () => {
    const { db, userId } = setup();
    connect(db, userId, {});
    connect(db, userId, { preset: "second_mortgage", schedule: "one_time", amountUsd: "9999.99" });
    settleStreams(db, userId, at(47));
    const entries = listEntries(db, userId);
    expect(getBalanceUsd(db, userId)).toBe(sum(entries.map((e) => e.amountUsd)));
    expect(entries.every((e) => e.kind === "stream")).toBe(true);
    expect(entries[0]).toMatchObject({ streamName: "Per Diem" });
  });
});

describe("cashIn", () => {
  it("pays once per press: a repeated payment number is a no-op", () => {
    const { db, sqlite, userId } = setup();
    const id = connect(db, userId, {
      preset: "custom",
      customName: "Craig owes me",
      schedule: "whenever",
      amountUsd: "40.00",
    });
    expect(cashIn(db, userId, { streamId: id, paymentNo: 1, now: at(1) })).toEqual({ ok: true });
    expect(cashIn(db, userId, { streamId: id, paymentNo: 1, now: at(1) })).toEqual({ ok: true });
    expect(cashIn(db, userId, { streamId: id, paymentNo: 2, now: at(2) })).toEqual({ ok: true });
    expect(streamEntries(sqlite).map((e) => [e.stream_payment_no, e.amount_usd])).toEqual([
      [1, "40.00"],
      [2, "40.00"],
    ]);
    expect(listStreams(db, userId, at(3))[0]).toMatchObject({ cashable: true, nextPaymentNo: 3 });
  });

  it("refuses outside the window, a scheduled stream, a disconnected one, and someone else's", () => {
    const { db, userId, other } = setup();
    const later = connect(db, userId, {
      preset: "garage_sale",
      schedule: "whenever",
      startsAt: iso(60),
      ongoing: false,
      endsAt: iso(120),
    });
    expect(cashIn(db, userId, { streamId: later, paymentNo: 1, now: at(30) })).toEqual({
      ok: false,
      code: "NOT_CASHABLE",
    });
    expect(cashIn(db, userId, { streamId: later, paymentNo: 1, now: at(121) })).toEqual({
      ok: false,
      code: "NOT_CASHABLE",
    });
    const scheduled = connect(db, userId, {});
    expect(cashIn(db, userId, { streamId: scheduled, paymentNo: 2, now: at(1) })).toEqual({
      ok: false,
      code: "NOT_CASHABLE",
    });
    disconnectStream(db, userId, later, at(61));
    expect(cashIn(db, userId, { streamId: later, paymentNo: 1, now: at(62) })).toEqual({
      ok: false,
      code: "NOT_CASHABLE",
    });
    expect(cashIn(db, other, { streamId: scheduled, paymentNo: 2, now: at(1) })).toEqual({
      ok: false,
      code: "STREAM_NOT_FOUND",
    });
  });
});

describe("disconnectStream and listStreams", () => {
  it("can't disconnect a one-time stream: it's already been applied", () => {
    const { db, userId } = setup();
    const fund = connect(db, userId, { preset: "college_fund", schedule: "one_time" });
    expect(disconnectStream(db, userId, fund, at(1))).toEqual({
      ok: false,
      code: "STREAM_NOT_FOUND",
    });
  });

  it("refuses someone else's stream or one already disconnected", () => {
    const { db, userId, other } = setup();
    const id = connect(db, userId, {});
    expect(disconnectStream(db, other, id, at(1))).toEqual({ ok: false, code: "STREAM_NOT_FOUND" });
    disconnectStream(db, userId, id, at(1));
    expect(disconnectStream(db, userId, id, at(2))).toEqual({
      ok: false,
      code: "STREAM_NOT_FOUND",
    });
  });

  it("lists connected streams first with what the account needs to show", () => {
    const { db, userId } = setup();
    const gone = connect(db, userId, { preset: "garage_sale", schedule: "whenever" });
    connect(db, userId, { preset: "college_fund", schedule: "one_time" });
    connect(db, userId, { ongoing: false, endsAt: iso(30) }, at(1));
    disconnectStream(db, userId, gone, at(2));
    const [perDiem, fund, sale] = listStreams(db, userId, at(3));
    expect(perDiem).toMatchObject({
      name: "Per Diem",
      isPerDiem: true,
      amountUsd: "75.00",
      schedule: "recurring",
      startsAt: iso(1),
      endsAt: iso(30),
      nextDueAt: iso(6),
      intervalMinutes: 5,
      canDisconnect: true,
      connected: true,
      ended: false,
      done: false,
      cashable: false,
    });
    // A one-time stream is applied the moment it's added: done, with nothing left to disconnect.
    expect(fund).toMatchObject({
      name: "My Kid's College Fund",
      connected: true,
      done: true,
      canDisconnect: false,
    });
    expect(sale).toMatchObject({ name: "Garage Sale", connected: false, canDisconnect: false });
  });
});
