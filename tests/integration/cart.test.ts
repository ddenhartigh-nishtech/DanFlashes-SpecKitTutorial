import { describe, expect, it } from "vitest";
import {
  addItem,
  findCartId,
  getCartView,
  getOrCreateCart,
  removeItem,
  updateItem,
} from "@/lib/cart/cart";
import { createSeededTestDb, setSwitches } from "../helpers/db";

describe("guest cart", () => {
  it("creates a guest cart, then reuses it by id", () => {
    const { db } = createSeededTestDb();
    const first = getOrCreateCart(db, { cartId: null, userId: null });
    expect(first.created).toBe(true);
    const again = getOrCreateCart(db, { cartId: first.id, userId: null });
    expect(again).toEqual({ id: first.id, created: false });
  });

  it("replaces an unknown or someone else's cart id with a fresh guest cart", () => {
    const { db, sqlite } = createSeededTestDb();
    expect(getOrCreateCart(db, { cartId: "nope", userId: null }).created).toBe(true);
    const owner = sqlite
      .prepare("INSERT INTO users (email, password_hash) VALUES ('o@x.y', 'h') RETURNING id")
      .get() as { id: number };
    const owned = getOrCreateCart(db, { cartId: null, userId: owner.id });
    const stolen = getOrCreateCart(db, { cartId: owned.id, userId: null });
    expect(stolen.id).not.toBe(owned.id);
  });

  it("gives each signed-in user exactly one cart", () => {
    const { db, sqlite } = createSeededTestDb();
    const user = sqlite
      .prepare("INSERT INTO users (email, password_hash) VALUES ('u@x.y', 'h') RETURNING id")
      .get() as { id: number };
    const a = getOrCreateCart(db, { cartId: null, userId: user.id });
    const b = getOrCreateCart(db, { cartId: "ignored", userId: user.id });
    expect(b).toEqual({ id: a.id, created: false });
    expect(findCartId(db, { cartId: null, userId: user.id })).toBe(a.id);
  });

  it("adds a shirt with a size, and the same shirt+size increments quantity", () => {
    const { db } = createSeededTestDb();
    const { id } = getOrCreateCart(db, { cartId: null, userId: null });
    expect(addItem(db, id, { slug: "geo-riot", size: "L" })).toMatchObject({
      ok: true,
      itemCount: 1,
    });
    const before = getCartView(db, id).lines[0].addedAt;
    expect(addItem(db, id, { slug: "geo-riot", size: "L" })).toMatchObject({
      ok: true,
      itemCount: 2,
    });
    const view = getCartView(db, id);
    expect(view.lines).toHaveLength(1);
    expect(view.lines[0]).toMatchObject({ size: "L", quantity: 2, addedAt: before });
  });

  it.each([
    [{ slug: "geo-riot", size: "" }, "SIZE_REQUIRED"],
    [{ slug: "geo-riot", size: "XXXL" }, "SIZE_REQUIRED"],
    [{ slug: "no-such-shirt", size: "M" }, "SHIRT_NOT_FOUND"],
    [{ slug: "retired-riot", size: "M" }, "SHIRT_INACTIVE"],
  ])("refuses %j with %s", (input, code) => {
    const { db } = createSeededTestDb();
    const { id } = getOrCreateCart(db, { cartId: null, userId: null });
    expect(addItem(db, id, input)).toEqual({ ok: false, code });
    expect(getCartView(db, id).lines).toHaveLength(0);
  });

  it("caps a line at 99", () => {
    const { db } = createSeededTestDb();
    const { id } = getOrCreateCart(db, { cartId: null, userId: null });
    addItem(db, id, { slug: "geo-riot", size: "M" });
    updateItem(db, id, { slug: "geo-riot", size: "M", quantity: 99 });
    addItem(db, id, { slug: "geo-riot", size: "M" });
    expect(getCartView(db, id).lines[0].quantity).toBe(99);
  });

  it("updates quantities, removes at 0, and validates the range", () => {
    const { db } = createSeededTestDb();
    const { id } = getOrCreateCart(db, { cartId: null, userId: null });
    addItem(db, id, { slug: "geo-riot", size: "M" });
    expect(updateItem(db, id, { slug: "geo-riot", size: "M", quantity: 3 })).toMatchObject({
      ok: true,
      itemCount: 3,
    });
    expect(updateItem(db, id, { slug: "geo-riot", size: "M", quantity: 100 })).toEqual({
      ok: false,
      code: "INVALID_QUANTITY",
    });
    expect(updateItem(db, id, { slug: "geo-riot", size: "M", quantity: 1.5 })).toEqual({
      ok: false,
      code: "INVALID_QUANTITY",
    });
    expect(updateItem(db, id, { slug: "geo-riot", size: "S", quantity: 2 })).toEqual({
      ok: false,
      code: "NOT_IN_CART",
    });
    expect(updateItem(db, id, { slug: "geo-riot", size: "M", quantity: 0 })).toMatchObject({
      ok: true,
      itemCount: 0,
    });
  });

  it("removes a line, and refuses one that isn't there", () => {
    const { db } = createSeededTestDb();
    const { id } = getOrCreateCart(db, { cartId: null, userId: null });
    addItem(db, id, { slug: "geo-riot", size: "M" });
    expect(removeItem(db, id, { slug: "geo-riot", size: "M" })).toMatchObject({
      ok: true,
      itemCount: 0,
    });
    expect(removeItem(db, id, { slug: "geo-riot", size: "M" })).toEqual({
      ok: false,
      code: "NOT_IN_CART",
    });
  });
});

describe("getCartView", () => {
  it("returns an empty view for no cart", () => {
    const { db } = createSeededTestDb();
    expect(getCartView(db, null)).toEqual({
      cartId: null,
      lines: [],
      itemCount: 0,
      subtotalUsd: "0.00",
      surchargeUsd: "0.00",
      surchargeCount: 0,
      removed: [],
    });
  });

  it("orders lines newest first, with live prices, tiers, and an exact subtotal", () => {
    const { db, sqlite } = createSeededTestDb();
    setSwitches(db, { blandShaming: false }); // a bland line, to check its BLAND badge
    const { id } = getOrCreateCart(db, { cartId: null, userId: null });
    addItem(db, id, { slug: "beige-regret", size: "S" });
    addItem(db, id, { slug: "geo-riot", size: "XL" });
    updateItem(db, id, { slug: "geo-riot", size: "XL", quantity: 3 });
    // Make the ordering independent of clock resolution.
    sqlite
      .prepare("UPDATE cart_items SET added_at = '2026-01-01T00:00:00.000Z' WHERE size = 'S'")
      .run();

    const view = getCartView(db, id);
    expect(view.lines.map((l) => l.shirt.slug)).toEqual(["geo-riot", "beige-regret"]);
    expect(view.lines[0]).toMatchObject({
      size: "XL",
      quantity: 3,
      lineTotalUsd: "1272.78",
      shirt: { finalPriceUsd: "424.26", tier: { name: "Complicated" } },
    });
    expect(view.lines[1].shirt.tier).toMatchObject({ name: "BLAND", isBland: true });
    expect(view.subtotalUsd).toBe("1457.45");
    expect(view.itemCount).toBe(4);
    expect(JSON.stringify(view)).not.toMatch(/complexity|msrp/i);
  });

  it("prices are live: changing the owner's final price changes the cart", () => {
    const { db, sqlite } = createSeededTestDb();
    const { id } = getOrCreateCart(db, { cartId: null, userId: null });
    addItem(db, id, { slug: "geo-riot", size: "M" });
    sqlite.prepare("UPDATE shirts SET final_price_usd = '500.00' WHERE slug = 'geo-riot'").run();
    expect(getCartView(db, id).subtotalUsd).toBe("500.00");
  });
});
