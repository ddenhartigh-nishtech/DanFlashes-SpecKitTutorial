import { describe, expect, it } from "vitest";
import { addItem, getOrCreateCart } from "@/lib/cart/cart";
import { placeOrder } from "@/lib/checkout/place-order";
import { getSettings } from "@/lib/data/settings";
import { topUp } from "@/lib/flash-credit/ledger";
import { getOrderForUser } from "@/lib/orders/orders";
import {
  connectStream,
  disconnectStream,
  getPerDiemMeter,
  settleStreams,
} from "@/lib/streams/streams";
import type { ConnectInput } from "@/lib/streams/validate";
import { createSeededTestDb, setSwitches } from "../helpers/db";

const START = new Date("2026-10-14T12:00:00.000Z");
const at = (minutes: number) => new Date(START.getTime() + minutes * 60_000);
const CARD = { number: "4242 4242 4242 4242", expiry: "12/39", cvc: "123" };

/** Every 10 minutes, so a test can step to the next top-off without waiting a day. */
const PER_DIEM: ConnectInput = {
  preset: "per_diem",
  customName: "",
  amountUsd: "500.00",
  schedule: "recurring",
  intervalCount: "10",
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
    return getOrderForUser(test.db, order.orderId, userId)!;
  };
  const meter = (now: Date = START) => {
    settleStreams(test.db, userId, now);
    return getPerDiemMeter(test.db, userId, getSettings(test.db));
  };
  return { ...test, userId, buy, meter };
}

describe("getPerDiemMeter", () => {
  it("is null without a connected per diem, or with the drain off", () => {
    const { db, userId, meter } = setup();
    expect(meter()).toBeNull();
    connectStream(db, userId, { ...PER_DIEM, preset: "garage_sale" }, START);
    expect(meter()).toBeNull(); // only the per diem is metered
    const perDiem = connectStream(db, userId, PER_DIEM, START);
    expect(meter()).toMatchObject({ leftUsd: "500.00", drained: false });
    setSwitches(db, { perDiemDrain: false });
    expect(meter()).toBeNull();
    setSwitches(db, { perDiemDrain: true });
    if (perDiem.ok) disconnectStream(db, userId, perDiem.streamId, at(1));
    expect(meter(at(1))).toBeNull();
  });

  it("subtracts every order since it started, by card or Flash Credit; earlier ones don't count", () => {
    const { db, userId, buy, meter } = setup();
    buy(at(-60)); // before the per diem: not his per diem's problem
    connectStream(db, userId, PER_DIEM, START);
    expect(meter()).toMatchObject({ leftUsd: "500.00" });
    buy(at(1));
    expect(meter(at(1))).toMatchObject({ leftUsd: "75.00", drained: false });

    topUp(db, userId, { amountInput: "1000.00", card: CARD, now: at(2) });
    const cartId = getOrCreateCart(db, { cartId: null, userId }).id;
    addItem(db, cartId, { slug: "beige-regret", size: "S" }); // bland: refused while shaming is on
    addItem(db, cartId, { slug: "fractal-fury", size: "S" });
    placeOrder(db, {
      userId,
      cartId: null,
      checkoutToken: "tok-credit",
      expectedTotalUsd: "999.99",
      useFlashCredit: true,
      expectedCreditUsd: "999.99",
      now: at(3),
    });
    expect(meter(at(3))).toMatchObject({ leftUsd: "0.00", drained: true });
  });

  it("is not 'drained' before the per diem has paid anything", () => {
    const { db, userId, meter } = setup();
    connectStream(db, userId, { ...PER_DIEM, startsAt: at(60).toISOString() }, START);
    expect(meter()).toMatchObject({ leftUsd: "0.00", drained: false });
  });

  it("still meters a per diem whose window has ended", () => {
    const { db, userId, meter } = setup();
    connectStream(db, userId, { ...PER_DIEM, ongoing: false, endsAt: at(15).toISOString() }, START);
    expect(meter(at(120))).toMatchObject({ leftUsd: "1000.00" });
  });
});

describe("placeOrder flags the order that drains the per diem", () => {
  it("flags only the crossing order, and again after a refill", () => {
    const { db, userId, buy, meter } = setup();
    connectStream(db, userId, PER_DIEM, START);
    const first = buy(at(1)); // 500.00 → 75.00
    const second = buy(at(2)); // 75.00 → 0.00: the drain
    const third = buy(at(3)); // already at 0.00: no second party
    expect([first, second, third].map((o) => o.perDiemDrained)).toEqual([false, true, false]);
    expect(meter(at(3))).toMatchObject({ leftUsd: "0.00", drained: true });

    // The next top-off (at minute 10) refills it, which arms the celebration again.
    expect(meter(at(10))).toMatchObject({ leftUsd: "500.00", drained: false });
    const refilledDrain = buy(at(11)); // 500.00 → 75.00
    const drainAgain = buy(at(12)); // 75.00 → 0.00
    expect([refilledDrain.perDiemDrained, drainAgain.perDiemDrained]).toEqual([false, true]);
  });

  it("counts a top-off that came due before checkout (settled in the same transaction)", () => {
    const { db, userId, buy } = setup();
    connectStream(db, userId, { ...PER_DIEM, amountUsd: "300.00" }, START);
    // At minute 10 a second $300 top-off is due: 600.00 − 425.00 is still above zero.
    expect(buy(at(10)).perDiemDrained).toBe(false);
    expect(buy(at(11)).perDiemDrained).toBe(true);
  });

  it("never flags while the drain is off, and turning it on later doesn't flag old orders", () => {
    const { db, userId, buy } = setup();
    connectStream(db, userId, PER_DIEM, START);
    setSwitches(db, { perDiemDrain: false });
    buy(at(1));
    const drainedWhileOff = buy(at(2));
    setSwitches(db, { perDiemDrain: true });
    expect(drainedWhileOff.perDiemDrained).toBe(false);
    expect(getOrderForUser(db, drainedWhileOff.id, userId)!.perDiemDrained).toBe(false);
  });
});
