import { describe, expect, it } from "vitest";
import { addItem, getOrCreateCart } from "@/lib/cart/cart";
import { placeOrder, type PlaceOrderInput } from "@/lib/checkout/place-order";
import { getBalanceUsd, listEntries, topUp } from "@/lib/flash-credit/ledger";
import { createSeededTestDb } from "../helpers/db";

const NOW = new Date("2026-10-13T12:00:00Z");
const CARD = { number: "4242424242424242", expiry: "12/29", cvc: "123" };

function setup(balance: string) {
  const test = createSeededTestDb();
  const userId = (
    test.sqlite
      .prepare("INSERT INTO users (email, password_hash) VALUES ('fc@x.io', 'h') RETURNING id")
      .get() as {
      id: number;
    }
  ).id;
  if (balance !== "0.00") topUp(test.db, userId, { amountInput: balance, card: CARD, now: NOW });
  const fill = () => {
    const cartId = getOrCreateCart(test.db, { cartId: null, userId }).id;
    addItem(test.db, cartId, { slug: "geo-riot", size: "M" }); // 424.26
  };
  fill();
  const input = (patch: Partial<PlaceOrderInput> = {}): PlaceOrderInput => ({
    userId,
    cartId: null,
    checkoutToken: "fc-token-1",
    expectedTotalUsd: "424.26",
    method: "flash_credit",
    now: NOW,
    ...patch,
  });
  return { ...test, userId, input, fill };
}

const count = (sqlite: import("better-sqlite3").Database, table: string) =>
  (sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

describe("placeOrder — Flash Credit", () => {
  it("spends exactly the total and links the spend to the order", () => {
    const { db, sqlite, userId, input } = setup("500.00");
    const result = placeOrder(db, input());
    expect(result).toEqual({ ok: true, orderId: expect.any(Number) });
    const { orderId } = result as { orderId: number };

    expect(getBalanceUsd(db, userId)).toBe("75.74");
    expect(listEntries(db, userId)[0]).toMatchObject({
      kind: "spend",
      amountUsd: "-424.26",
      orderId,
    });
    expect(
      sqlite.prepare("SELECT payment_method, card_brand, card_last4 FROM orders").get(),
    ).toEqual({
      payment_method: "flash_credit",
      card_brand: null,
      card_last4: null,
    });
  });

  it("spends a balance that exactly matches the total down to $0.00", () => {
    const { db, userId, input } = setup("424.26");
    expect(placeOrder(db, input())).toMatchObject({ ok: true });
    expect(getBalanceUsd(db, userId)).toBe("0.00");
  });

  it("refuses when the balance is short, writing nothing", () => {
    const { db, sqlite, userId, input } = setup("424.25");
    expect(placeOrder(db, input())).toEqual({
      ok: false,
      code: "INSUFFICIENT_FLASH_CREDIT",
      balanceUsd: "424.25",
    });
    expect(count(sqlite, "orders")).toBe(0);
    expect(getBalanceUsd(db, userId)).toBe("424.25");
  });

  it("two checkouts that together exceed the balance: the second is refused, never negative", () => {
    const { db, userId, input, fill } = setup("500.00");
    expect(placeOrder(db, input({ checkoutToken: "fc-token-a" }))).toMatchObject({ ok: true });
    fill();
    expect(placeOrder(db, input({ checkoutToken: "fc-token-b" }))).toMatchObject({
      ok: false,
      code: "INSUFFICIENT_FLASH_CREDIT",
    });
    expect(getBalanceUsd(db, userId)).toBe("75.74");
  });

  it("a replayed checkout token doesn't double-spend", () => {
    const { db, sqlite, userId, input } = setup("1000.00");
    const first = placeOrder(db, input());
    expect(placeOrder(db, input())).toEqual(first);
    expect(count(sqlite, "flash_credit_entries")).toBe(2); // one top-up, one spend
    expect(getBalanceUsd(db, userId)).toBe("575.74");
  });

  it("refuses Flash Credit for a guest when the gate is off", () => {
    const { db, sqlite } = setup("0.00");
    sqlite.prepare("UPDATE store_settings SET checkout_gate = 0").run();
    const guestCart = getOrCreateCart(db, { cartId: null, userId: null }).id;
    addItem(db, guestCart, { slug: "geo-riot", size: "M" });
    expect(
      placeOrder(db, {
        userId: null,
        cartId: guestCart,
        checkoutToken: "guest-token",
        expectedTotalUsd: "424.26",
        method: "flash_credit",
      }),
    ).toEqual({ ok: false, code: "SIGN_IN_REQUIRED" });
  });
});
