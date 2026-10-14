import { describe, expect, it } from "vitest";
import { addToCartCore, updateCartItemCore } from "@/lib/actions/cart";
import {
  addItem,
  auditCart,
  getCartView,
  getOrCreateCart,
  mergeGuestCart,
  removeItem,
  updateItem,
} from "@/lib/cart/cart";
import { placeOrder } from "@/lib/checkout/place-order";
import { copy } from "@/lib/copy";
import { CART_COOKIE } from "@/lib/http/cookies";
import { FakeCookieJar, form } from "../helpers/cookies";
import { createSeededTestDb, setSwitches } from "../helpers/db";

const CARD = { number: "4242 4242 4242 4242", expiry: "12/29", cvc: "123" };

function makeUser(sqlite: import("better-sqlite3").Database, email: string): number {
  return (
    sqlite
      .prepare("INSERT INTO users (email, password_hash) VALUES (?, 'h') RETURNING id")
      .get(email) as { id: number }
  ).id;
}

const quantities = (db: Parameters<typeof getCartView>[0], cartId: string) =>
  Object.fromEntries(getCartView(db, cartId).lines.map((l) => [l.shirt.slug, l.quantity]));

/** A cart holding a bland line that got in while shaming was off. Shaming is back on. */
function blandCart() {
  const test = createSeededTestDb();
  const cartId = getOrCreateCart(test.db, { cartId: null, userId: null }).id;
  setSwitches(test.db, { blandShaming: false });
  addItem(test.db, cartId, { slug: "beige-regret", size: "S" });
  addItem(test.db, cartId, { slug: "geo-riot", size: "M" });
  setSwitches(test.db, { blandShaming: true });
  return { ...test, cartId };
}

describe("bland-shirt shaming on (the default): the store refuses bland shirts", () => {
  it("refuses a bland add and writes no cart line", () => {
    const { db, sqlite } = createSeededTestDb();
    const cartId = getOrCreateCart(db, { cartId: null, userId: null }).id;
    expect(addItem(db, cartId, { slug: "beige-regret", size: "S" })).toEqual({
      ok: false,
      code: "BLAND_REFUSED",
    });
    expect(sqlite.prepare("SELECT count(*) AS n FROM cart_items").get()).toEqual({ n: 0 });
  });

  it("adds non-bland shirts exactly as before", () => {
    const { db } = createSeededTestDb();
    const cartId = getOrCreateCart(db, { cartId: null, userId: null }).id;
    expect(addItem(db, cartId, { slug: "geo-riot", size: "S" })).toEqual({
      ok: true,
      itemCount: 1,
    });
  });

  it("refuses raising a bland line's quantity, which is left alone", () => {
    const { db, sqlite, cartId } = blandCart();
    expect(updateItem(db, cartId, { slug: "beige-regret", size: "S", quantity: 3 })).toEqual({
      ok: false,
      code: "BLAND_REFUSED",
    });
    expect(
      sqlite
        .prepare("SELECT quantity FROM cart_items WHERE cart_id = ? AND shirt_id = 1")
        .get(cartId),
    ).toEqual({ quantity: 1 });
  });

  it("still lets a bland line be removed", () => {
    const { db, cartId } = blandCart();
    expect(removeItem(db, cartId, { slug: "beige-regret", size: "S" })).toEqual({
      ok: true,
      itemCount: 1,
    });
  });

  it("pulls bland lines already in a cart, reporting them as bland, and keeps the rest", () => {
    const { db, cartId } = blandCart();
    const view = getCartView(db, cartId);
    expect(view.removed).toEqual([
      { slug: "beige-regret", name: "Beige Regret", size: "S", quantity: 1, reason: "bland" },
    ]);
    expect(view.lines.map((l) => l.shirt.slug)).toEqual(["geo-riot"]);
    expect(auditCart(db, cartId)).toEqual([]);
  });

  it("still reports retired shirts as retired", () => {
    const { db, sqlite, cartId } = blandCart();
    sqlite.prepare("UPDATE shirts SET status = 'inactive' WHERE slug = 'geo-riot'").run();
    expect(auditCart(db, cartId)).toEqual([
      { slug: "beige-regret", name: "Beige Regret", size: "S", quantity: 1, reason: "bland" },
      { slug: "geo-riot", name: "Geo Riot", size: "M", quantity: 1, reason: "retired" },
    ]);
  });

  it("never lets a bland line be bought: checkout audits it out and writes no order", () => {
    const { db, sqlite, cartId } = blandCart();
    const userId = makeUser(sqlite, "buyer@x.io");
    sqlite.prepare("UPDATE carts SET user_id = ? WHERE id = ?").run(userId, cartId);
    expect(
      placeOrder(db, {
        userId,
        cartId: null,
        checkoutToken: "tok-bland",
        expectedTotalUsd: "608.93",
        method: "card",
        card: CARD,
        now: new Date("2026-10-13T12:00:00Z"),
      }),
    ).toEqual({
      ok: false,
      code: "CART_AUDITED",
      removed: [
        { slug: "beige-regret", name: "Beige Regret", size: "S", quantity: 1, reason: "bland" },
      ],
    });
    expect(sqlite.prepare("SELECT count(*) AS n FROM orders").get()).toEqual({ n: 0 });
  });

  it("decides blandness at the moment of the add: a re-tiered shirt is refused", () => {
    const { db, sqlite } = createSeededTestDb();
    const cartId = getOrCreateCart(db, { cartId: null, userId: null }).id;
    // Geo Riot scores 15; moving Complicated to start at 20 drops it into BLAND.
    sqlite.prepare("UPDATE complexity_tiers SET min_score = 20 WHERE name = 'Complicated'").run();
    expect(addItem(db, cartId, { slug: "geo-riot", size: "S" })).toMatchObject({
      code: "BLAND_REFUSED",
    });
  });

  it("doesn't carry a guest's bland lines into the account cart at sign-in", () => {
    const { db, sqlite } = createSeededTestDb();
    const userId = makeUser(sqlite, "merge@x.io");
    const mine = getOrCreateCart(db, { cartId: null, userId }).id;
    const guest = getOrCreateCart(db, { cartId: null, userId: null }).id;
    setSwitches(db, { blandShaming: false });
    addItem(db, mine, { slug: "beige-regret", size: "S" });
    addItem(db, guest, { slug: "beige-regret", size: "S" });
    addItem(db, guest, { slug: "geo-riot", size: "M" });
    setSwitches(db, { blandShaming: true });

    mergeGuestCart(db, guest, userId);
    const lines = sqlite
      .prepare(
        "SELECT s.slug, ci.quantity FROM cart_items ci JOIN shirts s ON s.id = ci.shirt_id WHERE ci.cart_id = ? ORDER BY s.slug",
      )
      .all(mine);
    expect(lines).toEqual([
      { slug: "beige-regret", quantity: 1 }, // not grown; the audit pulls it on the next view
      { slug: "geo-riot", quantity: 1 },
    ]);
  });

  it("leaves bland lines behind when the guest cart becomes the account's only cart", () => {
    const { db, sqlite } = createSeededTestDb();
    const userId = makeUser(sqlite, "first@x.io");
    const guest = getOrCreateCart(db, { cartId: null, userId: null }).id;
    setSwitches(db, { blandShaming: false });
    addItem(db, guest, { slug: "beige-regret", size: "S" });
    addItem(db, guest, { slug: "geo-riot", size: "M" });
    setSwitches(db, { blandShaming: true });

    mergeGuestCart(db, guest, userId);
    expect(sqlite.prepare("SELECT shirt_id FROM cart_items WHERE cart_id = ?").all(guest)).toEqual([
      { shirt_id: 2 },
    ]);
  });

  it("passes BLAND_REFUSED through the actions with its brand-voice message", () => {
    const { db, cartId } = blandCart();
    const jar = new FakeCookieJar({ [CART_COOKIE]: cartId });
    const refused = { ok: false, code: "BLAND_REFUSED", message: copy.codes.BLAND_REFUSED };
    expect(addToCartCore(db, jar, form({ slug: "beige-regret", size: "S" }))).toEqual(refused);
    expect(
      updateCartItemCore(db, jar, form({ slug: "beige-regret", size: "S", quantity: "2" })),
    ).toEqual(refused);
  });
});

describe("bland-shirt shaming off: bland shirts behave exactly as in 001", () => {
  it("adds, keeps, raises, and merges bland lines", () => {
    const { db, sqlite } = createSeededTestDb();
    setSwitches(db, { blandShaming: false });
    const userId = makeUser(sqlite, "off@x.io");
    const mine = getOrCreateCart(db, { cartId: null, userId }).id;
    const guest = getOrCreateCart(db, { cartId: null, userId: null }).id;

    expect(addItem(db, mine, { slug: "beige-regret", size: "S" })).toMatchObject({ ok: true });
    expect(updateItem(db, mine, { slug: "beige-regret", size: "S", quantity: 2 })).toMatchObject({
      ok: true,
    });
    addItem(db, guest, { slug: "beige-regret", size: "S" });
    mergeGuestCart(db, guest, userId);

    expect(getCartView(db, mine).removed).toEqual([]);
    expect(quantities(db, mine)).toEqual({ "beige-regret": 3 });
  });
});
