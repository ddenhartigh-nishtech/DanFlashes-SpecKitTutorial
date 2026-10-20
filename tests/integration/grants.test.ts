/**
 * Flash Credit grants (008 FR-036, SC-010, constitution VI): written before `grantCredit` existed,
 * and seen failing. The balance is the exact sum of the entries, never negative; a grant adds
 * exactly its amount, once per form, and spends like any other credit.
 */
import { describe, expect, it } from "vitest";
import { addItem, getOrCreateCart } from "@/lib/cart/cart";
import { placeOrder } from "@/lib/checkout/place-order";
import { getSettings } from "@/lib/data/settings";
import { getBalanceUsd, grantCredit, listEntries, topUp } from "@/lib/flash-credit/ledger";
import { cmp, sum } from "@/lib/money";
import { connectStream, getPerDiemMeter, getStreamBalances } from "@/lib/streams/streams";
import { createSeededTestDb } from "../helpers/db";
import { person } from "../helpers/people";

const CARD = { number: "4242424242424242", expiry: "12/39", cvc: "123" };
const NOW = new Date("2026-10-16T12:00:00.000Z");

function setup() {
  const test = createSeededTestDb();
  return { ...test, userId: person(test.db).id };
}

const grants = (sqlite: import("better-sqlite3").Database) =>
  sqlite.prepare("SELECT * FROM flash_credit_entries WHERE kind = 'grant'").all() as {
    amount_usd: string;
    grant_token: string;
    order_id: number | null;
    card_brand: string | null;
  }[];

describe("grantCredit: the balance (FR-036)", () => {
  it.each([["500.00"], ["0.01"], ["123456789012345.67"], ["1400"]])(
    "a grant of %s raises the balance by exactly that",
    (amount) => {
      const { db, userId } = setup();
      topUp(db, userId, { amountInput: "100.00", card: CARD, now: NOW });
      const result = grantCredit(db, userId, { amountInput: amount, token: `t-${amount}` });
      const expected = sum(["100.00", amount.includes(".") ? amount : `${amount}.00`]);
      expect(result).toEqual({ ok: true, balanceUsd: expected });
      expect(getBalanceUsd(db, userId)).toBe(expected);
    },
  );

  it("records one grant entry: positive, with its token, and no order, card or stream", () => {
    const { db, sqlite, userId } = setup();
    grantCredit(db, userId, { amountInput: "500", token: "only-one" });
    expect(grants(sqlite)).toEqual([
      expect.objectContaining({
        amount_usd: "500.00",
        grant_token: "only-one",
        order_id: null,
        card_brand: null,
      }),
    ]);
  });

  it("keeps the balance equal to the sum of the entries through top-ups, streams, spends and grants", () => {
    const { db, userId } = setup();
    topUp(db, userId, { amountInput: "300.00", card: CARD, now: NOW });
    const garage = connectStream(
      db,
      userId,
      {
        preset: "garage_sale",
        customName: "",
        amountUsd: "75.50",
        schedule: "one_time",
        intervalCount: "",
        intervalUnit: "minutes",
        startsAt: "",
        endsAt: "",
        ongoing: false,
      },
      NOW,
    );
    expect(garage.ok).toBe(true);
    grantCredit(db, userId, { amountInput: "250.25", token: "mix-1" });
    const cartId = getOrCreateCart(db, { cartId: null, userId }).id;
    addItem(db, cartId, { slug: "geo-riot", size: "M" }); // $425.00
    const order = placeOrder(db, {
      userId,
      cartId: null,
      checkoutToken: "mix-order",
      expectedTotalUsd: "425.00",
      useFlashCredit: true,
      expectedCreditUsd: "425.00",
      now: NOW,
    });
    expect(order.ok).toBe(true);
    grantCredit(db, userId, { amountInput: "0.99", token: "mix-2" });

    const entries = listEntries(db, userId);
    expect(entries.map((e) => e.kind).sort()).toEqual([
      "grant",
      "grant",
      "spend",
      "stream",
      "top_up",
    ]);
    const balance = getBalanceUsd(db, userId);
    expect(balance).toBe(sum(entries.map((e) => e.amountUsd)));
    expect(balance).toBe("201.74"); // 300 + 75.50 + 250.25 − 425.00 + 0.99
    expect(cmp(balance, "0.00")).toBeGreaterThanOrEqual(0);
  });
});

describe("grantCredit: refusals record nothing (FR-036)", () => {
  it.each([["0"], ["-5"], ["0.001"], ["abc"], [""], ["$"]])("refuses an amount of %j", (amount) => {
    const { db, sqlite, userId } = setup();
    expect(grantCredit(db, userId, { amountInput: amount, token: "t" })).toEqual({
      ok: false,
      code: "INVALID_AMOUNT",
    });
    expect(grants(sqlite)).toEqual([]);
  });

  it("refuses a customer who doesn't exist, and a missing token", () => {
    const { db, sqlite, userId } = setup();
    expect(grantCredit(db, 9999, { amountInput: "5", token: "t" })).toEqual({
      ok: false,
      code: "UNKNOWN_CUSTOMER",
    });
    expect(grantCredit(db, userId, { amountInput: "5", token: "  " })).toEqual({
      ok: false,
      code: "INVALID_TOKEN",
    });
    expect(grants(sqlite)).toEqual([]);
  });
});

describe("grantCredit: once per form (FR-036, SC-010)", () => {
  it("records a token's grant once; the second submit still answers with the balance", () => {
    const { db, sqlite, userId } = setup();
    const first = grantCredit(db, userId, { amountInput: "500.00", token: "double-click" });
    const second = grantCredit(db, userId, { amountInput: "500.00", token: "double-click" });
    expect(first).toEqual({ ok: true, balanceUsd: "500.00" });
    expect(second).toEqual({ ok: true, balanceUsd: "500.00" });
    expect(grants(sqlite)).toHaveLength(1);
  });
});

describe("granted credit in the shopper's world (FR-036)", () => {
  it("shows in his history as a grant, and checkout spends it", () => {
    const { db, userId } = setup();
    grantCredit(db, userId, { amountInput: "2000.00", token: "gift" });
    expect(listEntries(db, userId)[0]).toMatchObject({ kind: "grant", amountUsd: "2000.00" });

    const cartId = getOrCreateCart(db, { cartId: null, userId }).id;
    addItem(db, cartId, { slug: "geo-riot", size: "M" });
    const order = placeOrder(db, {
      userId,
      cartId: null,
      checkoutToken: "gift-order",
      expectedTotalUsd: "425.00",
      useFlashCredit: true,
      expectedCreditUsd: "425.00",
      now: NOW,
    });
    expect(order.ok).toBe(true);
    expect(getBalanceUsd(db, userId)).toBe("1575.00");
  });

  it("is other money to the per diem drain: the meter and each stream's left don't move", () => {
    const { db, userId } = setup();
    connectStream(
      db,
      userId,
      {
        preset: "per_diem",
        customName: "",
        amountUsd: "75.00",
        schedule: "recurring",
        intervalCount: "1",
        intervalUnit: "days",
        startsAt: "",
        endsAt: "",
        ongoing: true,
      },
      NOW,
    );
    const settings = getSettings(db);
    const meter = () => getPerDiemMeter(db, userId, settings);
    const left = () => [...(getStreamBalances(db, userId, settings) ?? new Map())];
    const [meterBefore, leftBefore] = [meter(), left()];
    grantCredit(db, userId, { amountInput: "1000.00", token: "drain" });
    expect(meter()).toEqual(meterBefore);
    expect(left()).toEqual(leftBefore);
  });
});
