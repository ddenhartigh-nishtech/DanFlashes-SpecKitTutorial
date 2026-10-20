import { describe, expect, it } from "vitest";
import { signUpCore } from "@/lib/actions/auth";
import { dismissDrainCore } from "@/lib/actions/streams";
import { addItem, getOrCreateCart } from "@/lib/cart/cart";
import { placeOrder } from "@/lib/checkout/place-order";
import { copy } from "@/lib/copy";
import { getSettings } from "@/lib/data/settings";
import {
  cashIn,
  connectStream,
  disconnectStream,
  dismissDrain,
  getDrainPops,
  getPerDiemMeter,
  settleStreams,
} from "@/lib/streams/streams";
import type { ConnectInput } from "@/lib/streams/validate";
import { FakeCookieJar, form } from "../helpers/cookies";
import { createSeededTestDb, setSwitches } from "../helpers/db";

const START = new Date("2026-10-14T12:00:00.000Z");
const at = (minutes: number) => new Date(START.getTime() + minutes * 60_000);
const CARD = { number: "4242 4242 4242 4242", expiry: "12/39", cvc: "123" };

const stream = (patch: Partial<ConnectInput>): ConnectInput => ({
  preset: "per_diem",
  customName: "",
  amountUsd: "500.00",
  schedule: "recurring",
  intervalCount: "10",
  intervalUnit: "minutes",
  startsAt: "",
  endsAt: "",
  ongoing: true,
  ...patch,
});
const COLLEGE_FUND = stream({ preset: "college_fund", amountUsd: "300.00", schedule: "one_time" });
const GARAGE_SALE = stream({ preset: "garage_sale", amountUsd: "50.00", schedule: "one_time" });
const CRAIG = stream({
  preset: "custom",
  customName: "Craig owes me",
  amountUsd: "40.00",
  schedule: "whenever",
});

async function setup() {
  const test = createSeededTestDb();
  const jar = new FakeCookieJar();
  await signUpCore(
    test.db,
    jar,
    form({ email: "dan@example.com", password: "complicated", displayName: "Dan" }),
  );
  const userId = (test.sqlite.prepare("SELECT id FROM users").get() as { id: number }).id;
  const connect = (input: ConnectInput, now: Date) => {
    const result = connectStream(test.db, userId, input, now);
    if (!result.ok) throw new Error(`connect failed: ${result.code}`);
    return result.streamId;
  };
  let token = 0;
  /** Buy one Geo Riot ($425.00 in the test catalog) by card at `now`. */
  const buy = (now: Date) => {
    const cartId = getOrCreateCart(test.db, { cartId: null, userId }).id;
    addItem(test.db, cartId, { slug: "geo-riot", size: "M" });
    const order = placeOrder(test.db, {
      userId,
      cartId: null,
      checkoutToken: `tok-${++token}`,
      expectedTotalUsd: "425.00",
      useFlashCredit: false,
      card: CARD,
      now,
    });
    if (!order.ok) throw new Error(`order failed: ${order.code}`);
  };
  const pops = (now: Date) => {
    settleStreams(test.db, userId, now);
    return getDrainPops(test.db, userId, getSettings(test.db));
  };
  const meter = (now: Date) => {
    settleStreams(test.db, userId, now);
    return getPerDiemMeter(test.db, userId, getSettings(test.db));
  };
  return { ...test, jar, userId, connect, buy, pops, meter };
}

describe("getDrainPops", () => {
  it("pops every stream but a per diem that has paid in and is spent to $0", async () => {
    const { db, userId, connect, buy, pops } = await setup();
    connect(stream({ amountUsd: "20.00" }), START);
    const college = connect(COLLEGE_FUND, START);
    const garage = connect(GARAGE_SALE, START);
    const craig = connect(CRAIG, START);
    expect(pops(START)).toEqual([]); // nothing spent yet

    cashIn(db, userId, { streamId: craig, paymentNo: 1, now: START });
    disconnectStream(db, userId, craig, at(1)); // its money still counts, and still drains
    buy(at(2)); // $410.00 of stream money against $425.00: everything runs dry
    expect(pops(at(2))).toEqual([
      { streamId: college, name: "My Kid's College Fund", preset: "college_fund", paymentNo: 1 },
      { streamId: garage, name: "Garage Sale", preset: "garage_sale", paymentNo: 1 },
      { streamId: craig, name: "Craig owes me", preset: null, paymentNo: 1 },
    ]);
  });

  it("is null while the drain is off", async () => {
    const { db, connect, buy, pops } = await setup();
    connect(COLLEGE_FUND, START);
    buy(at(1));
    setSwitches(db, { perDiemDrain: false });
    expect(pops(at(1))).toBeNull();
  });
});

describe("dismissDrain", () => {
  it("clears one pop until that stream pays in again and drains again", async () => {
    const { db, userId, connect, buy, pops } = await setup();
    const garage = connect(GARAGE_SALE, START);
    const craig = connect(CRAIG, START);
    cashIn(db, userId, { streamId: craig, paymentNo: 1, now: START });
    buy(at(1));
    expect(pops(at(1))!.map((p) => p.streamId)).toEqual([garage, craig]);

    expect(dismissDrain(db, userId, { streamId: craig, paymentNo: 1 })).toEqual({ ok: true });
    expect(pops(at(1))!.map((p) => p.streamId)).toEqual([garage]);

    cashIn(db, userId, { streamId: craig, paymentNo: 2, now: at(2) });
    expect(pops(at(2))!.map((p) => p.streamId)).toEqual([garage]); // money again: no pop
    buy(at(3));
    expect(pops(at(3))).toEqual([
      { streamId: garage, name: "Garage Sale", preset: "garage_sale", paymentNo: 1 },
      { streamId: craig, name: "Craig owes me", preset: null, paymentNo: 2 },
    ]);
  });

  it("clears only the drain he saw: a stale (x) can't hide a newer one", async () => {
    const { db, userId, connect, buy, pops } = await setup();
    const craig = connect(CRAIG, START);
    cashIn(db, userId, { streamId: craig, paymentNo: 1, now: START });
    buy(at(1)); // the page shows the pop for payment 1…
    cashIn(db, userId, { streamId: craig, paymentNo: 2, now: at(2) });
    buy(at(3)); // …and it drains again before he clicks
    dismissDrain(db, userId, { streamId: craig, paymentNo: 1 });
    expect(pops(at(3))).toEqual([
      { streamId: craig, name: "Craig owes me", preset: null, paymentNo: 2 },
    ]);

    dismissDrain(db, userId, { streamId: craig, paymentNo: 2 });
    dismissDrain(db, userId, { streamId: craig, paymentNo: 1 }); // a late, older click lowers nothing
    expect(pops(at(3))).toEqual([]);
  });

  it("refuses a payment the stream hasn't made, and someone else's stream", async () => {
    const { db, sqlite, userId, connect } = await setup();
    const craig = connect(CRAIG, START);
    cashIn(db, userId, { streamId: craig, paymentNo: 1, now: START });
    const notFound = { ok: false, code: "STREAM_NOT_FOUND" };
    expect(dismissDrain(db, userId, { streamId: craig, paymentNo: 2 })).toEqual(notFound);
    expect(dismissDrain(db, userId, { streamId: craig, paymentNo: 0 })).toEqual(notFound);
    const other = (
      sqlite
        .prepare("INSERT INTO users (email, password_hash) VALUES ('gary@x.io', 'h') RETURNING id")
        .get() as { id: number }
    ).id;
    expect(dismissDrain(db, other, { streamId: craig, paymentNo: 1 })).toEqual(notFound);
  });

  it("clears the per diem gauge's GONE until the next top-off refills it and it drains again", async () => {
    const { db, userId, connect, buy, meter } = await setup();
    const perDiem = connect(stream({}), START);
    buy(at(1));
    buy(at(2)); // 500.00 → 75.00 → 0.00
    expect(meter(at(2))).toMatchObject({ drained: true, dismissed: false, paymentNo: 1 });

    dismissDrain(db, userId, { streamId: perDiem, paymentNo: 1 });
    expect(meter(at(2))).toMatchObject({ drained: true, dismissed: true });

    expect(meter(at(10))).toMatchObject({ leftUsd: "500.00", dismissed: false, paymentNo: 2 });
    buy(at(11));
    buy(at(12));
    expect(meter(at(12))).toMatchObject({ drained: true, dismissed: false, paymentNo: 2 });
  });
});

describe("dismissDrainCore", () => {
  it("sends guests to sign in, refuses unknown streams, and clears his own", async () => {
    const { db, jar, connect, buy, pops } = await setup();
    const garage = connect(GARAGE_SALE, START);
    buy(at(1));
    const input = form({ streamId: String(garage), paymentNo: "1" });
    expect(dismissDrainCore(db, new FakeCookieJar(), input)).toEqual({
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: copy.codes.SIGN_IN_REQUIRED,
    });
    expect(dismissDrainCore(db, jar, form({ streamId: "999", paymentNo: "1" }))).toMatchObject({
      ok: false,
      code: "STREAM_NOT_FOUND",
    });
    expect(dismissDrainCore(db, jar, input)).toMatchObject({ ok: true });
    expect(pops(at(1))).toEqual([]);
  });
});
