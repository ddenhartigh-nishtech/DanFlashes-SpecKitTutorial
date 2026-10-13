import { describe, expect, it } from "vitest";
import {
  addItem,
  findCartId,
  getCartView,
  getOrCreateCart,
  mergeGuestCart,
  updateItem,
} from "@/lib/cart/cart";
import { createSeededTestDb } from "../helpers/db";

function makeUser(sqlite: import("better-sqlite3").Database, email: string): number {
  return (
    sqlite
      .prepare("INSERT INTO users (email, password_hash) VALUES (?, 'h') RETURNING id")
      .get(email) as {
      id: number;
    }
  ).id;
}

describe("mergeGuestCart", () => {
  it("reassigns the guest cart when the user has none", () => {
    const { db, sqlite } = createSeededTestDb();
    const guest = getOrCreateCart(db, { cartId: null, userId: null }).id;
    addItem(db, guest, { slug: "geo-riot", size: "M" });
    const userId = makeUser(sqlite, "a@x.io");

    mergeGuestCart(db, guest, userId);
    expect(findCartId(db, { cartId: null, userId })).toBe(guest);
    expect(findCartId(db, { cartId: guest, userId: null })).toBeNull(); // no longer a guest cart
    expect(getCartView(db, guest).itemCount).toBe(1);
  });

  it("merges into the user's cart: quantities add (capped at 99), earlier added_at wins, guest cart deleted", () => {
    const { db, sqlite } = createSeededTestDb();
    const userId = makeUser(sqlite, "b@x.io");
    const mine = getOrCreateCart(db, { cartId: null, userId }).id;
    addItem(db, mine, { slug: "geo-riot", size: "M" });
    updateItem(db, mine, { slug: "geo-riot", size: "M", quantity: 98 });
    addItem(db, mine, { slug: "beige-regret", size: "S" });

    const guest = getOrCreateCart(db, { cartId: null, userId: null }).id;
    addItem(db, guest, { slug: "geo-riot", size: "M" });
    updateItem(db, guest, { slug: "geo-riot", size: "M", quantity: 5 });
    addItem(db, guest, { slug: "fractal-fury", size: "XL" });
    sqlite
      .prepare(
        "UPDATE cart_items SET added_at = '2020-01-01T00:00:00.000Z' WHERE cart_id = ? AND size = 'M'",
      )
      .run(guest);

    mergeGuestCart(db, guest, userId);

    const view = getCartView(db, mine);
    const bySlug = Object.fromEntries(view.lines.map((l) => [l.shirt.slug, l]));
    expect(bySlug["geo-riot"]).toMatchObject({ quantity: 99, addedAt: "2020-01-01T00:00:00.000Z" });
    expect(bySlug["beige-regret"].quantity).toBe(1);
    expect(bySlug["fractal-fury"].quantity).toBe(1);
    expect(sqlite.prepare("SELECT count(*) AS n FROM carts WHERE id = ?").get(guest)).toEqual({
      n: 0,
    });
  });

  it("is a no-op without a guest cart, or for a cart that already belongs to someone", () => {
    const { db, sqlite } = createSeededTestDb();
    const userId = makeUser(sqlite, "c@x.io");
    expect(() => mergeGuestCart(db, null, userId)).not.toThrow();
    expect(() => mergeGuestCart(db, "missing", userId)).not.toThrow();

    const other = makeUser(sqlite, "d@x.io");
    const theirs = getOrCreateCart(db, { cartId: null, userId: other }).id;
    addItem(db, theirs, { slug: "geo-riot", size: "M" });
    mergeGuestCart(db, theirs, userId);
    expect(findCartId(db, { cartId: null, userId: other })).toBe(theirs);
    expect(findCartId(db, { cartId: null, userId })).toBeNull();
  });
});
