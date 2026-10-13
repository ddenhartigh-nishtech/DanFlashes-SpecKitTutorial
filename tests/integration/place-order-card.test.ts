import { describe, expect, it } from "vitest";
import { addItem, getCartView, getOrCreateCart, updateItem } from "@/lib/cart/cart";
import { placeOrder, type PlaceOrderInput } from "@/lib/checkout/place-order";
import { getOrderForUser, listOrdersForUser } from "@/lib/orders/orders";
import { createSeededTestDb, setSwitches } from "../helpers/db";

const NOW = new Date("2026-10-13T12:00:00Z");
const CARD = { number: "4242 4242 4242 4242", expiry: "12/29", cvc: "123" };

function setup() {
  const test = createSeededTestDb();
  setSwitches(test.db, { blandShaming: false }); // 001's fixture cart holds a bland line
  const userId = (
    test.sqlite
      .prepare("INSERT INTO users (email, password_hash) VALUES ('buyer@x.io', 'h') RETURNING id")
      .get() as {
      id: number;
    }
  ).id;
  const cartId = getOrCreateCart(test.db, { cartId: null, userId }).id;
  addItem(test.db, cartId, { slug: "geo-riot", size: "L" });
  updateItem(test.db, cartId, { slug: "geo-riot", size: "L", quantity: 2 });
  addItem(test.db, cartId, { slug: "beige-regret", size: "S" });
  // geo-riot 424.26 × 2 + beige-regret 184.67 = 1033.19
  const input = (patch: Partial<PlaceOrderInput> = {}): PlaceOrderInput => ({
    userId,
    cartId: null,
    checkoutToken: "tok-1",
    expectedTotalUsd: "1033.19",
    method: "card",
    card: CARD,
    now: NOW,
    ...patch,
  });
  return { ...test, userId, cartId, input };
}

const count = (sqlite: import("better-sqlite3").Database, table: string) =>
  (sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

describe("placeOrder — card", () => {
  it("records the order with exact totals and $0 shipping and tax", () => {
    const { db, sqlite, input } = setup();
    const result = placeOrder(db, input());
    expect(result).toEqual({ ok: true, orderId: expect.any(Number) });

    const order = sqlite.prepare("SELECT * FROM orders").get() as Record<string, unknown>;
    expect(order).toMatchObject({
      subtotal_usd: "1033.19",
      shipping_usd: "0.00",
      tax_usd: "0.00",
      total_usd: "1033.19",
      payment_method: "card",
      card_brand: "Visa",
      card_last4: "4242",
    });
  });

  it("snapshots each line: name, tier, complexity, final price, and MSRP", () => {
    const { db, sqlite, input } = setup();
    sqlite.prepare("UPDATE shirts SET final_price_usd = '500.00' WHERE slug = 'geo-riot'").run();
    placeOrder(db, input({ expectedTotalUsd: "1184.67" }));
    const items = sqlite
      .prepare(
        "SELECT shirt_name, tier_name, complexity, size, quantity, final_price_usd, msrp_usd FROM order_items ORDER BY shirt_name",
      )
      .all();
    expect(items).toEqual([
      {
        shirt_name: "Beige Regret",
        tier_name: "BLAND",
        complexity: 3,
        size: "S",
        quantity: 1,
        final_price_usd: "184.67",
        msrp_usd: "184.67",
      },
      {
        shirt_name: "Geo Riot",
        tier_name: "Complicated",
        complexity: 15,
        size: "L",
        quantity: 2,
        final_price_usd: "500.00",
        msrp_usd: "424.26",
      },
    ]);
  });

  it("empties the cart but keeps the cart row, and leaves Flash Credit untouched", () => {
    const { db, sqlite, input, cartId } = setup();
    placeOrder(db, input());
    expect(getCartView(db, cartId).lines).toEqual([]);
    expect(count(sqlite, "carts")).toBe(1);
    expect(count(sqlite, "flash_credit_entries")).toBe(0);
  });

  it("never charges a price the client sent: a stale expected total is PRICE_CHANGED", () => {
    const { db, sqlite, input } = setup();
    expect(placeOrder(db, input({ expectedTotalUsd: "0.01" }))).toEqual({
      ok: false,
      code: "PRICE_CHANGED",
      totalUsd: "1033.19",
    });
    expect(placeOrder(db, input({ expectedTotalUsd: "garbage" }))).toMatchObject({
      code: "PRICE_CHANGED",
    });
    expect(count(sqlite, "orders")).toBe(0);
  });

  it("a replayed checkout token returns the same order instead of a second one", () => {
    const { db, sqlite, input } = setup();
    const first = placeOrder(db, input());
    const replay = placeOrder(db, input());
    expect(replay).toEqual(first);
    expect(count(sqlite, "orders")).toBe(1);
  });

  it("removes deactivated lines and refuses with CART_AUDITED, writing no order", () => {
    const { db, sqlite, input, cartId } = setup();
    sqlite.prepare("UPDATE shirts SET status = 'inactive' WHERE slug = 'geo-riot'").run();
    expect(placeOrder(db, input())).toEqual({
      ok: false,
      code: "CART_AUDITED",
      removed: [{ slug: "geo-riot", name: "Geo Riot", size: "L", quantity: 2, reason: "retired" }],
    });
    expect(count(sqlite, "orders")).toBe(0);
    expect(getCartView(db, cartId).lines.map((l) => l.shirt.slug)).toEqual(["beige-regret"]);
  });

  it("refuses an empty cart", () => {
    const { db, input, cartId } = setup();
    updateItem(db, cartId, { slug: "geo-riot", size: "L", quantity: 0 });
    updateItem(db, cartId, { slug: "beige-regret", size: "S", quantity: 0 });
    expect(placeOrder(db, input())).toEqual({ ok: false, code: "CART_EMPTY" });
  });

  it.each([
    [{ number: "4242424242424241", expiry: "12/29", cvc: "123" }, "CARD_INVALID_NUMBER"],
    [{ number: "4242424242424242", expiry: "01/20", cvc: "123" }, "CARD_EXPIRED"],
    [{ number: "4242424242424242", expiry: "12/29", cvc: "1" }, "CARD_INVALID_CVC"],
  ])("refuses an invalid card (%j → %s) and writes nothing", (card, code) => {
    const { db, sqlite, input } = setup();
    expect(placeOrder(db, input({ card }))).toEqual({ ok: false, code });
    expect(count(sqlite, "orders")).toBe(0);
  });

  it("enforces the checkout gate for guests", () => {
    const { db, input } = setup();
    expect(placeOrder(db, input({ userId: null }))).toEqual({
      ok: false,
      code: "GATE_SIGN_IN_REQUIRED",
    });
  });

  it("stores no full card number and no CVC anywhere", () => {
    const { db, sqlite, input } = setup();
    placeOrder(db, input({ card: { number: "4242424242424242", expiry: "12/29", cvc: "987" } }));
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
      name: string;
    }[];
    // Compare whole cell values: a 3-digit CVC turns up by chance inside hashes and timestamps.
    const cells = tables.flatMap((t) =>
      (sqlite.prepare(`SELECT * FROM "${t.name}"`).all() as Record<string, unknown>[]).flatMap(
        (row) => Object.values(row).map(String),
      ),
    );
    expect(cells.some((c) => c.includes("4242424242424242"))).toBe(false);
    expect(cells).not.toContain("987");
  });
});

describe("order read model", () => {
  it("returns the order to its owner only, with summary lines and a DF number", () => {
    const { db, sqlite, input, userId } = setup();
    const { orderId } = placeOrder(db, input()) as { orderId: number };
    const order = getOrderForUser(db, orderId, userId)!;
    expect(order.number).toBe(`DF-${String(orderId).padStart(6, "0")}`);
    expect(order).toMatchObject({
      subtotalUsd: "1033.19",
      shippingUsd: "0.00",
      taxUsd: "0.00",
      totalUsd: "1033.19",
    });
    expect(order.payment).toEqual({ method: "card", brand: "Visa", last4: "4242" });
    expect(order.lines.map((l) => [l.slug, l.quantity, l.lineTotalUsd, l.tier.name])).toEqual([
      // Same order the cart showed: newest line first.
      ["beige-regret", 1, "184.67", "BLAND"],
      ["geo-riot", 2, "848.52", "Complicated"],
    ]);
    expect(order.lines[1].image?.url).toBe("/media/shirts/geo-riot.svg");

    const stranger = (
      sqlite
        .prepare("INSERT INTO users (email, password_hash) VALUES ('x@x.io', 'h') RETURNING id")
        .get() as { id: number }
    ).id;
    expect(getOrderForUser(db, orderId, stranger)).toBeNull();
    expect(listOrdersForUser(db, userId).map((o) => o.id)).toEqual([orderId]);
    expect(listOrdersForUser(db, stranger)).toEqual([]);
  });
});
