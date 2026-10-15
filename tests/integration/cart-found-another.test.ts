import { describe, expect, it } from "vitest";
import { addToCartCore, updateCartItemCore } from "@/lib/actions/cart";
import { addItem, getCartView, getOrCreateCart, updateItem } from "@/lib/cart/cart";
import { placeOrder } from "@/lib/checkout/place-order";
import { copy } from "@/lib/copy";
import { findShirtRef } from "@/lib/data/shirts";
import { orderedShirtIds } from "@/lib/orders/orders";
import { CART_COOKIE } from "@/lib/http/cookies";
import { FakeCookieJar, form } from "../helpers/cookies";
import { createSeededTestDb, setSwitches } from "../helpers/db";

const FOUND = copy.urgency.foundAnother;
const ADDED_AND_FOUND = `${copy.product.added} ${FOUND}`;
const CARD = { number: "4242 4242 4242 4242", expiry: "12/39", cvc: "123" };

/** A guest with Geo Riot (M) already in the cart: quantity 1. */
function guestWithGeoRiot() {
  const test = createSeededTestDb();
  const jar = new FakeCookieJar();
  addToCartCore(test.db, jar, form({ slug: "geo-riot", size: "M" }));
  const update = (quantity: number, slug = "geo-riot") =>
    updateCartItemCore(test.db, jar, form({ slug, size: "M", quantity: String(quantity) }));
  return { ...test, jar, update, cartId: () => jar.get(CART_COOKIE)! };
}

describe("addItem / updateItem report what they replaced", () => {
  it("returns the shirt and its previous quantity (0 for a new line)", () => {
    const { db } = createSeededTestDb();
    const cartId = getOrCreateCart(db, { cartId: null, userId: null }).id;
    const geoRiot = findShirtRef(db, "geo-riot")!.id;
    expect(addItem(db, cartId, { slug: "geo-riot", size: "M" })).toMatchObject({
      ok: true,
      shirtId: geoRiot,
      previousQuantity: 0,
    });
    expect(addItem(db, cartId, { slug: "geo-riot", size: "M" })).toMatchObject({
      previousQuantity: 1,
    });
    expect(updateItem(db, cartId, { slug: "geo-riot", size: "M", quantity: 5 })).toMatchObject({
      ok: true,
      shirtId: geoRiot,
      previousQuantity: 2,
    });
  });
});

describe("addToCart: 'Oh wait, we found another one!'", () => {
  it("finds another one for a non-bland shirt, every time", () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    expect(addToCartCore(db, jar, form({ slug: "geo-riot", size: "M" }))).toEqual({
      ok: true,
      itemCount: 1,
      message: ADDED_AND_FOUND,
    });
    expect(addToCartCore(db, jar, form({ slug: "geo-riot", size: "M" }))).toMatchObject({
      message: ADDED_AND_FOUND,
    });
  });

  it("finds nothing with the switch off, or for a bland shirt (shaming off)", () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    setSwitches(db, { blandShaming: false });
    expect(addToCartCore(db, jar, form({ slug: "beige-regret", size: "M" }))).toMatchObject({
      message: copy.product.added,
    });
    setSwitches(db, { fakeScarcity: false });
    expect(addToCartCore(db, jar, form({ slug: "geo-riot", size: "M" }))).toMatchObject({
      message: copy.product.added,
    });
  });

  it("leaves the refusals exactly as they were", () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    expect(addToCartCore(db, jar, form({ slug: "geo-riot", size: "" }))).toMatchObject({
      ok: false,
      code: "SIZE_REQUIRED",
    });
  });
});

describe("updateCartItem: found another one only on a raise", () => {
  it("says it on a raise, and nothing on a cut, an unchanged quantity, or a remove", () => {
    const { update } = guestWithGeoRiot();
    expect(update(3)).toEqual({ ok: true, itemCount: 3, message: FOUND });
    expect(update(2)).toEqual({ ok: true, itemCount: 2 });
    expect(update(2)).toEqual({ ok: true, itemCount: 2 });
    expect(update(0)).toEqual({ ok: true, itemCount: 0 });
  });

  it("says nothing for a bland shirt, or with the switch off", () => {
    const { db, jar, update } = guestWithGeoRiot();
    setSwitches(db, { blandShaming: false });
    addToCartCore(db, jar, form({ slug: "beige-regret", size: "M" }));
    expect(update(4, "beige-regret")).not.toHaveProperty("message");
    setSwitches(db, { fakeScarcity: false });
    expect(update(5)).not.toHaveProperty("message");
  });

  it("leaves the cart exactly as it would be with the switch off (FR-003, SC-002)", () => {
    const run = (fakeScarcity: boolean) => {
      const { db, jar, update, cartId } = guestWithGeoRiot();
      setSwitches(db, { fakeScarcity });
      addToCartCore(db, jar, form({ slug: "fractal-fury", size: "S" }));
      addToCartCore(db, jar, form({ slug: "geo-riot", size: "M" }));
      update(7);
      update(4);
      const view = getCartView(db, cartId());
      return {
        lines: view.lines.map((l) => [l.shirt.slug, l.size, l.quantity, l.lineTotalUsd]),
        itemCount: view.itemCount,
        subtotalUsd: view.subtotalUsd,
      };
    };
    expect(run(true)).toEqual(run(false));
  });
});

describe("orderedShirtIds", () => {
  it("lists the shirts in his own orders only, and nothing for a guest", () => {
    const { db, sqlite } = createSeededTestDb();
    const user = (email: string) =>
      (
        sqlite
          .prepare("INSERT INTO users (email, password_hash) VALUES (?, 'h') RETURNING id")
          .get(email) as { id: number }
      ).id;
    const buy = (userId: number, slug: string, total: string, token: string) => {
      const cartId = getOrCreateCart(db, { cartId: null, userId }).id;
      addItem(db, cartId, { slug, size: "M" });
      const order = placeOrder(db, {
        userId,
        cartId: null,
        checkoutToken: token,
        expectedTotalUsd: total,
        useFlashCredit: false,
        card: CARD,
      });
      if (!order.ok) throw new Error(order.code);
    };
    const dan = user("dan@x.io");
    const gary = user("gary@x.io");
    buy(dan, "geo-riot", "424.26", "tok-1");
    buy(dan, "geo-riot", "424.26", "tok-2");
    buy(gary, "fractal-fury", "999.99", "tok-3");

    expect([...orderedShirtIds(db, dan)]).toEqual([findShirtRef(db, "geo-riot")!.id]);
    expect([...orderedShirtIds(db, gary)]).toEqual([findShirtRef(db, "fractal-fury")!.id]);
    expect(orderedShirtIds(db, null).size).toBe(0);
  });
});
