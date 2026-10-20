import { describe, expect, it } from "vitest";
import { addItem, getOrCreateCart } from "@/lib/cart/cart";
import { placeOrder } from "@/lib/checkout/place-order";
import { getCustomer, listCustomers } from "@/lib/data/admin-customers";
import { getAdminOrder, listAllOrders } from "@/lib/data/admin-orders";
import { topUp } from "@/lib/flash-credit/ledger";
import { createSeededTestDb } from "../helpers/db";
import { person } from "../helpers/people";

const CARD = { number: "4242424242424242", expiry: "12/39", cvc: "123" };
const NOW = new Date("2026-10-16T12:00:00.000Z");

/** Greg: $1,000 topped up, one card order and one Flash Credit order. Plus an admin, and a guest order. */
function setup() {
  const test = createSeededTestDb();
  const { db, sqlite } = test;
  const greg = person(db, { email: "greg@accounts.test", displayName: "Greg" }).id;
  const owner = person(db, { email: "dan@office.test", displayName: "Dan", admin: true }).id;
  topUp(db, greg, { amountInput: "1000.00", card: CARD, now: NOW });
  let n = 0;
  const buy = (slug: string, credit: boolean) => {
    const cartId = getOrCreateCart(db, { cartId: null, userId: greg }).id;
    addItem(db, cartId, { slug, size: "L" });
    const total = slug === "geo-riot" ? "425.00" : "999.99";
    const order = placeOrder(db, {
      userId: greg,
      cartId: null,
      checkoutToken: `greg-${++n}`,
      expectedTotalUsd: total,
      useFlashCredit: credit,
      ...(credit ? { expectedCreditUsd: total } : { card: CARD }),
      now: NOW,
    });
    if (!order.ok) throw new Error(order.code);
    return order.orderId;
  };
  const cardOrder = buy("fractal-fury", false);
  const creditOrder = buy("geo-riot", true);
  sqlite.exec(`
    INSERT INTO orders (id, user_id, checkout_token, subtotal_usd, total_usd, payment_method, card_brand, card_last4, per_diem_drained)
      VALUES (500, NULL, 'guest-1', '424.26', '424.26', 'card', 'Mastercard', '4444', 0);
  `);
  return { ...test, greg, owner, cardOrder, creditOrder };
}

describe("listCustomers (008 FR-032)", () => {
  it("gives each account its orders, exact lifetime spend, balance and admin flag", () => {
    const { db, greg, owner } = setup();
    const rows = listCustomers(db, {});
    expect(rows.find((c) => c.id === greg)).toMatchObject({
      email: "greg@accounts.test",
      displayName: "Greg",
      isAdmin: false,
      orderCount: 2,
      lifetimeSpendUsd: "1424.99",
      balanceUsd: "575.00",
    });
    expect(rows.find((c) => c.id === owner)).toMatchObject({
      isAdmin: true,
      orderCount: 0,
      lifetimeSpendUsd: "0.00",
      balanceUsd: "0.00",
    });
  });

  it("searches names and emails, in any case", () => {
    const { db, greg } = setup();
    expect(listCustomers(db, { q: "GREG" }).map((c) => c.id)).toEqual([greg]);
    expect(listCustomers(db, { q: "accounts.test" }).map((c) => c.id)).toEqual([greg]);
    expect(listCustomers(db, { q: "nobody-at-all" })).toEqual([]);
  });
});

describe("getCustomer (008 FR-033)", () => {
  it("has the orders, the ledger, the streams and the drains", () => {
    const { db, sqlite, greg, cardOrder } = setup();
    sqlite.prepare("UPDATE orders SET per_diem_drained = 1 WHERE id = ?").run(cardOrder);
    const customer = getCustomer(db, greg)!;
    expect(customer.customer.balanceUsd).toBe("575.00");
    expect(customer.orders).toHaveLength(2);
    expect(customer.entries.map((e) => e.kind).sort()).toEqual(["spend", "top_up"]);
    expect(customer.streams).toEqual([]);
    expect(customer.drains).toEqual([
      expect.objectContaining({ orderId: cardOrder, perDiem: true, streams: [] }),
    ]);
    expect(getCustomer(db, 9999)).toBeNull();
  });
});

describe("orders (008 FR-034, FR-035)", () => {
  it("lists every order newest first, with the customer or Guest", () => {
    const { db, greg } = setup();
    const rows = listAllOrders(db);
    expect(rows[0]).toMatchObject({
      id: 500,
      number: "DF-000500",
      customer: null,
      totalUsd: "424.26",
    });
    expect(rows.filter((r) => r.customer?.id === greg)).toHaveLength(2);
  });

  it("shows a line's score and MSRP from the day it was bought, and the card's brand and last four only", () => {
    const { db, sqlite, cardOrder } = setup();
    // Change the catalog afterwards: the order keeps what it was.
    sqlite.prepare("UPDATE shirts SET complexity = 99 WHERE slug = 'fractal-fury'").run();
    const view = getAdminOrder(db, cardOrder)!;
    expect(view.lines).toEqual([
      expect.objectContaining({
        name: "Fractal Fury",
        tierName: "Very Complicated",
        complexity: 30,
        msrpUsd: "800.00",
        finalPriceUsd: "999.99",
        size: "L",
        quantity: 1,
      }),
    ]);
    expect(view.order.payment).toEqual({ method: "card", brand: "Visa", last4: "4242" });
    expect(JSON.stringify(view)).not.toContain("4242424242424242");
    expect(view.order.addOns).toEqual([]);
    expect(view.customer).toMatchObject({ displayName: "Greg" });
    expect(getAdminOrder(db, 9999)).toBeNull();
  });

  it("shows the Flash Credit an order spent", () => {
    const { db, creditOrder } = setup();
    expect(getAdminOrder(db, creditOrder)!.order.payment).toEqual({ method: "flash_credit" });
    expect(getAdminOrder(db, creditOrder)!.flashCreditUsd).toBe("425.00");
  });
});
