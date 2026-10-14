import { describe, expect, it } from "vitest";
import { addItem, getOrCreateCart } from "@/lib/cart/cart";
import { placeOrder } from "@/lib/checkout/place-order";
import { getSettings } from "@/lib/data/settings";
import { getOrderForUser } from "@/lib/orders/orders";
import {
  cashIn,
  connectStream,
  disconnectStream,
  getStreamBalances,
  settleStreams,
} from "@/lib/streams/streams";
import type { ConnectInput } from "@/lib/streams/validate";
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
const PER_DIEM = stream({});
const COLLEGE_FUND = stream({ preset: "college_fund", amountUsd: "300.00", schedule: "one_time" });
const GARAGE_SALE = stream({ preset: "garage_sale", amountUsd: "50.00", schedule: "one_time" });
const CRAIG = stream({
  preset: "custom",
  customName: "Craig owes me",
  amountUsd: "40.00",
  schedule: "whenever",
});

function setup() {
  const test = createSeededTestDb();
  const userId = (
    test.sqlite
      .prepare("INSERT INTO users (email, password_hash) VALUES ('dan@x.io', 'h') RETURNING id")
      .get() as { id: number }
  ).id;
  const connect = (input: ConnectInput, now: Date) => {
    const result = connectStream(test.db, userId, input, now);
    if (!result.ok) throw new Error(`connect failed: ${result.code}`);
    return result.streamId;
  };
  let token = 0;
  /** Buy one Geo Riot ($424.26 in the test catalog) by card at `now`. */
  const buy = (now: Date) => {
    const cartId = getOrCreateCart(test.db, { cartId: null, userId }).id;
    addItem(test.db, cartId, { slug: "geo-riot", size: "M" });
    const order = placeOrder(test.db, {
      userId,
      cartId: null,
      checkoutToken: `tok-${++token}`,
      expectedTotalUsd: "424.26",
      useFlashCredit: false,
      card: CARD,
      now,
    });
    if (!order.ok) throw new Error(`order failed: ${order.code}`);
    return getOrderForUser(test.db, order.orderId, userId)!;
  };
  /** What's left of each stream, by stream id. */
  const balances = (now: Date) => {
    settleStreams(test.db, userId, now);
    const left = getStreamBalances(test.db, userId, getSettings(test.db));
    return left && Object.fromEntries(left);
  };
  const drains = () =>
    test.sqlite.prepare("SELECT order_id, stream_id FROM order_drains ORDER BY rowid").all();
  return { ...test, userId, connect, buy, balances, drains };
}

describe("getStreamBalances", () => {
  it("counts every order against the per diem first, then the oldest money", () => {
    const { connect, buy, balances } = setup();
    const college = connect(COLLEGE_FUND, START);
    const garage = connect(GARAGE_SALE, at(1));
    const perDiem = connect(PER_DIEM, at(2)); // connected last, still spent first
    expect(balances(at(2))).toEqual({
      [college]: "300.00",
      [garage]: "50.00",
      [perDiem]: "500.00",
    });

    buy(at(3)); // 500.00 − 424.26
    expect(balances(at(3))).toEqual({ [college]: "300.00", [garage]: "50.00", [perDiem]: "75.74" });

    buy(at(4)); // the per diem's last 75.74, then the oldest money: College Fund, then Garage Sale
    expect(balances(at(4))).toEqual({ [college]: "0.00", [garage]: "1.48", [perDiem]: "0.00" });
  });

  it("is null while the drain is off", () => {
    const { db, connect, balances } = setup();
    connect(COLLEGE_FUND, START);
    setSwitches(db, { perDiemDrain: false });
    expect(balances(START)).toBeNull();
  });

  it("still counts a disconnected stream's money", () => {
    const { db, userId, connect, buy, balances } = setup();
    const craig = connect(CRAIG, START);
    cashIn(db, userId, { streamId: craig, paymentNo: 1, now: START });
    disconnectStream(db, userId, craig, at(1));
    expect(balances(at(1))).toEqual({ [craig]: "40.00" });
    expect(buy(at(2)).drainedStreams).toEqual([
      { streamId: craig, name: "Craig owes me", preset: null },
    ]);
  });
});

describe("placeOrder records every stream it drains", () => {
  it("one order can drain several streams; each is its own achievement", () => {
    const { connect, buy, drains } = setup();
    const perDiem = connect(stream({ amountUsd: "20.00" }), START);
    const college = connect(COLLEGE_FUND, START);
    const garage = connect(GARAGE_SALE, START);

    const order = buy(at(1)); // $370.00 of stream money against $424.26: all three run dry
    expect(order.perDiemDrained).toBe(true); // the current per diem keeps its own flag
    expect(order.drainedStreams).toEqual([
      { streamId: college, name: "My Kid's College Fund", preset: "college_fund" },
      { streamId: garage, name: "Garage Sale", preset: "garage_sale" },
    ]);
    expect(drains()).toEqual([
      { order_id: order.id, stream_id: college },
      { order_id: order.id, stream_id: garage },
    ]);
    expect(drains()).not.toContainEqual({ order_id: order.id, stream_id: perDiem });
  });

  it("flags only the order that empties each stream", () => {
    const { connect, buy } = setup();
    const college = connect(COLLEGE_FUND, START);
    const garage = connect(GARAGE_SALE, at(1));
    connect(PER_DIEM, at(2));

    const first = buy(at(3)); // per diem 500.00 → 75.74
    const second = buy(at(4)); // per diem → 0.00, College Fund → 0.00, Garage Sale → 1.48
    const third = buy(at(5)); // Garage Sale → 0.00
    const fourth = buy(at(6)); // nothing left to drain
    expect([first, second, third, fourth].map((o) => o.perDiemDrained)).toEqual([
      false,
      true,
      false,
      false,
    ]);
    expect(
      [first, second, third, fourth].map((o) => o.drainedStreams.map((d) => d.streamId)),
    ).toEqual([[], [college], [garage], []]);
  });

  it("re-arms when a stream pays in again", () => {
    const { db, userId, connect, buy } = setup();
    const craig = connect(CRAIG, START);
    cashIn(db, userId, { streamId: craig, paymentNo: 1, now: START });
    expect(buy(at(1)).drainedStreams.map((d) => d.streamId)).toEqual([craig]);
    expect(buy(at(2)).drainedStreams).toEqual([]); // already at $0
    cashIn(db, userId, { streamId: craig, paymentNo: 2, now: at(3) });
    expect(buy(at(4)).drainedStreams.map((d) => d.streamId)).toEqual([craig]);
  });

  it("records nothing while the drain is off, and turning it on later awards nothing old", () => {
    const { db, userId, connect, buy, drains } = setup();
    connect(COLLEGE_FUND, START);
    connect(stream({ amountUsd: "20.00" }), START);
    setSwitches(db, { perDiemDrain: false });
    const order = buy(at(1));
    setSwitches(db, { perDiemDrain: true });
    expect(drains()).toEqual([]);
    const reread = getOrderForUser(db, order.id, userId)!;
    expect(reread.perDiemDrained).toBe(false);
    expect(reread.drainedStreams).toEqual([]);
  });
});
