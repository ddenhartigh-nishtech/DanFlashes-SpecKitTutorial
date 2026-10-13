import { describe, expect, it } from "vitest";
import { addItem, auditCart, getCartView, getOrCreateCart } from "@/lib/cart/cart";
import { createSeededTestDb } from "../helpers/db";

describe("cart audit (FR-016)", () => {
  it("is a no-op on an empty or missing cart", () => {
    const { db } = createSeededTestDb();
    const { id } = getOrCreateCart(db, { cartId: null, userId: null });
    expect(auditCart(db, id)).toEqual([]);
    expect(auditCart(db, "missing")).toEqual([]);
  });

  it("removes lines whose shirt was deactivated, reports them, and keeps the rest", () => {
    const { db, sqlite } = createSeededTestDb();
    const { id } = getOrCreateCart(db, { cartId: null, userId: null });
    addItem(db, id, { slug: "geo-riot", size: "M" });
    addItem(db, id, { slug: "beige-regret", size: "L" });
    sqlite.prepare("UPDATE shirts SET status = 'inactive' WHERE slug = 'geo-riot'").run();

    expect(auditCart(db, id)).toEqual([
      { slug: "geo-riot", name: "Geo Riot", size: "M", quantity: 1 },
    ]);
    expect(getCartView(db, id).lines.map((l) => l.shirt.slug)).toEqual(["beige-regret"]);
  });

  it("getCartView runs the audit first and reports what it removed", () => {
    const { db, sqlite } = createSeededTestDb();
    const { id } = getOrCreateCart(db, { cartId: null, userId: null });
    addItem(db, id, { slug: "geo-riot", size: "M" });
    sqlite.prepare("UPDATE shirts SET status = 'inactive' WHERE slug = 'geo-riot'").run();

    const view = getCartView(db, id);
    expect(view.lines).toEqual([]);
    expect(view.removed).toEqual([{ slug: "geo-riot", name: "Geo Riot", size: "M", quantity: 1 }]);
    expect(getCartView(db, id).removed).toEqual([]); // reported once, then gone
  });
});
