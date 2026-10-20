import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { saveSurchargeCore } from "@/lib/actions/admin/settings";
import { setShirtListedCore } from "@/lib/actions/admin/generator";
import { makeItMineCore } from "@/lib/actions/dial";
import { addItem, getCartView, getOrCreateCart, updateItem } from "@/lib/cart/cart";
import { placeOrder } from "@/lib/checkout/place-order";
import { orderTotals } from "@/lib/checkout/totals";
import { copy } from "@/lib/copy";
import { getSettings } from "@/lib/data/settings";
import { getShirtBySlug } from "@/lib/data/shirts";
import type { Db } from "@/lib/db/client";
import { topUp } from "@/lib/flash-credit/ledger";
import { add, mul } from "@/lib/money";
import { getOrderForUser } from "@/lib/orders/orders";
import { buildDial } from "@/lib/pattern/dial-view";
import { form } from "../helpers/cookies";
import { createSeededTestDb, setSwitches } from "../helpers/db";
import { person } from "../helpers/people";

let dir = "";
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-uniq-"));
  process.env.MEDIA_UPLOADS_DIR = dir;
});
afterAll(() => {
  delete process.env.MEDIA_UPLOADS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

const CARD = { number: "4242424242424242", expiry: "12/39", cvc: "123" };
const NOW = new Date("2026-10-19T12:00:00.000Z");

/** The maker with his own shirt (×2 in size L) and a catalog shirt (×1) in his cart. */
function cartWithBoth(balance = "0.00") {
  const test = createSeededTestDb();
  const maker = person(test.db);
  const made = makeItMineCore(
    test.db,
    form({ code: buildDial(test.db, {})!.steps[40].code! }),
    maker.id,
  );
  if (!made.ok || !("slug" in made)) throw new Error("not made");
  const cartId = getOrCreateCart(test.db, { cartId: null, userId: maker.id }).id;
  addItem(test.db, cartId, { slug: made.slug, size: "L" });
  updateItem(test.db, cartId, { slug: made.slug, size: "L", quantity: 2 });
  addItem(test.db, cartId, { slug: "geo-riot", size: "M" });
  if (balance !== "0.00") topUp(test.db, maker.id, { amountInput: balance, card: CARD, now: NOW });
  return { ...test, maker, cartId, slug: made.slug };
}

/** What checkout shows: the shirts, the surcharge, and the add-ons (none ticked here). */
const shownTotal = (db: Db, cartId: string) => {
  const view = getCartView(db, cartId);
  return orderTotals({
    subtotalUsd: view.subtotalUsd,
    surchargeUsd: view.surchargeUsd,
    addOnPrices: [],
    shippingUsd: "0.00",
    taxUsd: "0.00",
  }).totalUsd;
};

describe("the cart's Uniquity Surcharge (007 FR-027, R15)", () => {
  it("is the amount once for every one-of-a-kind shirt, and nothing for the rest", () => {
    const { db, cartId, slug } = cartWithBoth();
    const view = getCartView(db, cartId);
    expect(view).toMatchObject({ surchargeUsd: "999.98", surchargeCount: 2 });
    expect(view.lines.find((l) => l.shirt.slug === slug)).toMatchObject({ surchargeUsd: "499.99" });
    expect(view.lines.find((l) => l.shirt.slug === "geo-riot")).toMatchObject({
      surchargeUsd: "0.00",
    });
  });

  it("follows the amount Dan sets, and stops while the switch is off", () => {
    const { db, cartId } = cartWithBoth();
    setSwitches(db, { uniquitySurchargeUsd: "0.01" });
    expect(getCartView(db, cartId)).toMatchObject({ surchargeUsd: "0.02", surchargeCount: 2 });
    setSwitches(db, { uniquitySurcharge: false });
    expect(getCartView(db, cartId)).toMatchObject({ surchargeUsd: "0.00", surchargeCount: 0 });
  });

  it("is gone once Dan puts the shirt into mass production", () => {
    const { db, cartId, slug } = cartWithBoth();
    const dan = person(db, { admin: true });
    setShirtListedCore(
      db,
      dan.jar,
      form({ id: String(getShirtBySlug(db, slug)!.id), listed: "1" }),
    );
    expect(getCartView(db, cartId)).toMatchObject({ surchargeUsd: "0.00", surchargeCount: 0 });
  });
});

describe("checkout charges it, by every payment method (007 FR-027, SC-010)", () => {
  const pay = (
    test: ReturnType<typeof cartWithBoth>,
    how: { useFlashCredit: boolean; expectedCreditUsd?: string; confirmSplit?: boolean },
    token: string,
  ) =>
    placeOrder(test.db, {
      userId: test.maker.id,
      cartId: null,
      checkoutToken: token,
      expectedTotalUsd: shownTotal(test.db, test.cartId),
      card: CARD,
      now: NOW,
      ...how,
    });

  /** The order adds up: shirts plus surcharges is the total, and each line kept its surcharge. */
  function expectChargedRight(db: Db, orderId: number, userId: number, slug: string) {
    const order = getOrderForUser(db, orderId, userId)!;
    expect(order.surcharge).toEqual({ count: 2, totalUsd: "999.98" });
    expect(order.totalUsd).toBe(add(order.subtotalUsd, "999.98"));
    const mine = order.lines.find((l) => l.slug === slug)!;
    const geo = order.lines.find((l) => l.slug === "geo-riot")!;
    expect(order.subtotalUsd).toBe(add(mul(mine.unitPriceUsd, 2), geo.unitPriceUsd));
  }

  it("by card", () => {
    const test = cartWithBoth();
    const order = pay(test, { useFlashCredit: false }, "card");
    if (!order.ok) throw new Error(order.code);
    expectChargedRight(test.db, order.orderId, test.maker.id, test.slug);
    const lines = test.sqlite
      .prepare("SELECT surcharge_usd FROM order_items WHERE order_id = ?")
      .all(order.orderId) as { surcharge_usd: string }[];
    expect(lines.map((r) => r.surcharge_usd).sort()).toEqual(["0.00", "499.99"]);
  });

  it("by Flash Credit", () => {
    const test = cartWithBoth("100000000.00");
    const total = shownTotal(test.db, test.cartId);
    const order = pay(test, { useFlashCredit: true, expectedCreditUsd: total }, "credit");
    if (!order.ok) throw new Error(order.code);
    expectChargedRight(test.db, order.orderId, test.maker.id, test.slug);
    expect(getOrderForUser(test.db, order.orderId, test.maker.id)!.payment).toEqual({
      method: "flash_credit",
    });
  });

  it("split between Flash Credit and a card", () => {
    const test = cartWithBoth("10.00");
    const order = pay(
      test,
      { useFlashCredit: true, expectedCreditUsd: "10.00", confirmSplit: true },
      "split",
    );
    if (!order.ok) throw new Error(order.code);
    expectChargedRight(test.db, order.orderId, test.maker.id, test.slug);
  });

  it("with add-ons too: shirts plus surcharges plus add-ons, to the cent (SC-010)", () => {
    const test = cartWithBoth();
    const addOns = test.sqlite
      .prepare("SELECT id, price_usd FROM add_ons WHERE active = 1")
      .all() as {
      id: number;
      price_usd: string;
    }[];
    expect(addOns.length).toBeGreaterThan(0);
    const view = getCartView(test.db, test.cartId);
    const expected = orderTotals({
      subtotalUsd: view.subtotalUsd,
      surchargeUsd: view.surchargeUsd,
      addOnPrices: addOns.map((a) => a.price_usd),
      shippingUsd: "0.00",
      taxUsd: "0.00",
    }).totalUsd;
    const order = placeOrder(test.db, {
      userId: test.maker.id,
      cartId: null,
      checkoutToken: "with-add-ons",
      expectedTotalUsd: expected,
      addOnIds: addOns.map((a) => a.id),
      useFlashCredit: false,
      card: CARD,
      now: NOW,
    });
    if (!order.ok) throw new Error(order.code);
    const placed = getOrderForUser(test.db, order.orderId, test.maker.id)!;
    const addOnsUsd = placed.addOns.reduce((total, a) => add(total, a.priceUsd), "0.00");
    expect(placed.totalUsd).toBe(
      add(add(placed.subtotalUsd, placed.surcharge!.totalUsd), addOnsUsd),
    );
    expect(placed.totalUsd).toBe(expected);
  });

  it.each([
    ["Dan changes the amount", (db: Db) => setSwitches(db, { uniquitySurchargeUsd: "1.00" })],
    ["Dan switches it off", (db: Db) => setSwitches(db, { uniquitySurcharge: false })],
  ])("refuses a total he didn't see when %s, and charges nothing", (_n, change) => {
    const test = cartWithBoth();
    const shown = shownTotal(test.db, test.cartId);
    change(test.db);
    const order = placeOrder(test.db, {
      userId: test.maker.id,
      cartId: null,
      checkoutToken: "late",
      expectedTotalUsd: shown,
      useFlashCredit: false,
      card: CARD,
    });
    expect(order).toMatchObject({ ok: false, code: "PRICE_CHANGED" });
    expect(test.sqlite.prepare("SELECT COUNT(*) AS n FROM orders").get()).toEqual({ n: 0 });
  });

  it("keeps what it charged when Dan changes the amount later", () => {
    const test = cartWithBoth();
    const order = pay(test, { useFlashCredit: false }, "kept");
    if (!order.ok) throw new Error(order.code);
    setSwitches(test.db, { uniquitySurchargeUsd: "1.00" });
    expect(getOrderForUser(test.db, order.orderId, test.maker.id)!.surcharge).toEqual({
      count: 2,
      totalUsd: "999.98",
    });
  });

  it("shows no surcharge on an order without one", () => {
    const test = cartWithBoth();
    setSwitches(test.db, { uniquitySurcharge: false });
    const order = pay(test, { useFlashCredit: false }, "none");
    if (!order.ok) throw new Error(order.code);
    expect(getOrderForUser(test.db, order.orderId, test.maker.id)!.surcharge).toBeNull();
  });
});

describe("saveSurcharge in Dan's Office (007 FR-027)", () => {
  it("saves dollars and cents, zero included", () => {
    const { db } = createSeededTestDb();
    const dan = person(db, { admin: true });
    expect(saveSurchargeCore(db, dan.jar, form({ amountUsd: "1,234.5" }))).toMatchObject({
      ok: true,
    });
    expect(getSettings(db).uniquitySurchargeUsd).toBe("1234.50");
    expect(saveSurchargeCore(db, dan.jar, form({ amountUsd: "0" })).ok).toBe(true);
    expect(getSettings(db).uniquitySurchargeUsd).toBe("0.00");
  });

  it.each([["lots"], ["-5.00"], [""]])("refuses %j, and changes nothing", (amountUsd) => {
    const { db } = createSeededTestDb();
    const dan = person(db, { admin: true });
    expect(saveSurchargeCore(db, dan.jar, form({ amountUsd }))).toMatchObject({
      ok: false,
      issues: [{ field: "amountUsd", message: copy.console.settings.surcharge.format }],
    });
    expect(getSettings(db).uniquitySurchargeUsd).toBe("499.99");
  });
});
