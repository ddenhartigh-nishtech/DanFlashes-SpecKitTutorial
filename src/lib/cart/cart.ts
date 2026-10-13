/**
 * Carts (data-model: carts, cart_items). Carts never store prices — every view resolves them live
 * from the catalog (FR-028). Lines for deactivated shirts are removed by the cart audit (FR-016).
 */
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { SIZES, type Size } from "@/lib/catalog/types";
import {
  getCatalogShirtsByIds,
  toShopperShirt,
  type CatalogShirt,
  type ShopperShirt,
} from "@/lib/data/shirts";
import type { Db } from "@/lib/db/client";
import { cartItems, carts, shirts } from "@/lib/db/schema";
import { mul, sum, type Usd } from "@/lib/money";
import type { Err, Ok } from "@/lib/result";

export const MAX_QUANTITY = 99;

export type CartErrorCode =
  "SIZE_REQUIRED" | "SHIRT_NOT_FOUND" | "SHIRT_INACTIVE" | "NOT_IN_CART" | "INVALID_QUANTITY";

export type CartResult = Ok<{ itemCount: number }> | Err<CartErrorCode>;

export interface CartOwner {
  cartId: string | null;
  userId: number | null;
}

export interface RemovedLine {
  slug: string;
  name: string;
  size: Size;
  quantity: number;
}

export interface CartLine {
  shirt: ShopperShirt;
  size: Size;
  quantity: number;
  addedAt: string;
  lineTotalUsd: Usd;
}

/** Server-only line shape (carries the CatalogShirt) for checkout. */
export interface CheckoutLine {
  shirt: CatalogShirt;
  size: Size;
  quantity: number;
  addedAt: string;
  lineTotalUsd: Usd;
}

export interface CartView {
  cartId: string | null;
  lines: CartLine[];
  itemCount: number;
  subtotalUsd: Usd;
  removed: RemovedLine[];
}

const isSize = (value: string): value is Size => (SIZES as readonly string[]).includes(value);

/** The owner's cart id, without creating one. A guest id never resolves to a user's cart. */
export function findCartId(db: Db, owner: CartOwner): string | null {
  if (owner.userId !== null) {
    return (
      db.select({ id: carts.id }).from(carts).where(eq(carts.userId, owner.userId)).get()?.id ??
      null
    );
  }
  if (!owner.cartId) return null;
  return (
    db
      .select({ id: carts.id })
      .from(carts)
      .where(and(eq(carts.id, owner.cartId), isNull(carts.userId)))
      .get()?.id ?? null
  );
}

export function getOrCreateCart(db: Db, owner: CartOwner): { id: string; created: boolean } {
  const existing = findCartId(db, owner);
  if (existing) return { id: existing, created: false };
  const id = randomUUID();
  db.insert(carts).values({ id, userId: owner.userId }).run();
  return { id, created: true };
}

function touch(db: Db, cartId: string): void {
  db.update(carts)
    .set({ updatedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))` })
    .where(eq(carts.id, cartId))
    .run();
}

export function itemCount(db: Db, cartId: string | null): number {
  if (!cartId) return 0;
  const row = db
    .select({ n: sql<number>`coalesce(sum(${cartItems.quantity}), 0)` })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId))
    .get();
  return row?.n ?? 0;
}

export function addItem(db: Db, cartId: string, input: { slug: string; size: string }): CartResult {
  if (!isSize(input.size)) return { ok: false, code: "SIZE_REQUIRED" };
  const shirt = db
    .select({ id: shirts.id, status: shirts.status })
    .from(shirts)
    .where(eq(shirts.slug, input.slug))
    .get();
  if (!shirt) return { ok: false, code: "SHIRT_NOT_FOUND" };
  if (shirt.status !== "active") return { ok: false, code: "SHIRT_INACTIVE" };

  db.insert(cartItems)
    .values({ cartId, shirtId: shirt.id, size: input.size, quantity: 1 })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.shirtId, cartItems.size],
      set: { quantity: sql`min(${cartItems.quantity} + 1, ${MAX_QUANTITY})` },
    })
    .run();
  touch(db, cartId);
  return { ok: true, itemCount: itemCount(db, cartId) };
}

function lineWhere(db: Db, cartId: string, slug: string, size: string) {
  const shirt = db.select({ id: shirts.id }).from(shirts).where(eq(shirts.slug, slug)).get();
  if (!shirt || !isSize(size)) return null;
  const where = and(
    eq(cartItems.cartId, cartId),
    eq(cartItems.shirtId, shirt.id),
    eq(cartItems.size, size),
  );
  return db.select().from(cartItems).where(where).get() ? where : null;
}

export function updateItem(
  db: Db,
  cartId: string,
  input: { slug: string; size: string; quantity: number },
): CartResult {
  if (!Number.isInteger(input.quantity) || input.quantity < 0 || input.quantity > MAX_QUANTITY) {
    return { ok: false, code: "INVALID_QUANTITY" };
  }
  const where = lineWhere(db, cartId, input.slug, input.size);
  if (!where) return { ok: false, code: "NOT_IN_CART" };
  if (input.quantity === 0) db.delete(cartItems).where(where).run();
  else db.update(cartItems).set({ quantity: input.quantity }).where(where).run();
  touch(db, cartId);
  return { ok: true, itemCount: itemCount(db, cartId) };
}

export function removeItem(
  db: Db,
  cartId: string,
  input: { slug: string; size: string },
): CartResult {
  return updateItem(db, cartId, { ...input, quantity: 0 });
}

/** Delete lines for deactivated shirts and report them (FR-016). */
export function auditCart(db: Db, cartId: string | null): RemovedLine[] {
  if (!cartId) return [];
  const doomed = db
    .select({
      shirtId: cartItems.shirtId,
      slug: shirts.slug,
      name: shirts.name,
      size: cartItems.size,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .innerJoin(shirts, eq(cartItems.shirtId, shirts.id))
    .where(and(eq(cartItems.cartId, cartId), eq(shirts.status, "inactive")))
    .all();
  if (doomed.length === 0) return [];
  db.delete(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        inArray(
          cartItems.shirtId,
          doomed.map((d) => d.shirtId),
        ),
      ),
    )
    .run();
  return doomed.map(({ slug, name, size, quantity }) => ({ slug, name, size, quantity }));
}

/** Current lines with live catalog prices, newest first. Does not audit. */
export function loadCheckoutLines(db: Db, cartId: string): CheckoutLine[] {
  const rows = db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId))
    .orderBy(desc(cartItems.addedAt), sql`rowid desc`)
    .all();
  const catalog = getCatalogShirtsByIds(
    db,
    rows.map((r) => r.shirtId),
  );
  return rows.map((row) => {
    const shirt = catalog.get(row.shirtId)!;
    return {
      shirt,
      size: row.size,
      quantity: row.quantity,
      addedAt: row.addedAt,
      lineTotalUsd: mul(shirt.finalPriceUsd, row.quantity),
    };
  });
}

/** The shopper's cart: audits first, then resolves live prices (FR-015, FR-016). */
export function getCartView(db: Db, cartId: string | null): CartView {
  if (!cartId) return { cartId: null, lines: [], itemCount: 0, subtotalUsd: "0.00", removed: [] };
  const removed = auditCart(db, cartId);
  const lines = loadCheckoutLines(db, cartId).map((line) => ({
    shirt: toShopperShirt(line.shirt),
    size: line.size,
    quantity: line.quantity,
    addedAt: line.addedAt,
    lineTotalUsd: line.lineTotalUsd,
  }));
  return {
    cartId,
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotalUsd: sum(lines.map((l) => l.lineTotalUsd)),
    removed,
  };
}

/**
 * On sign-in/sign-up: fold the guest cart into the user's cart (FR-022). Identical shirt+size
 * lines add their quantities (capped at 99) and keep the earlier added_at; the guest cart is
 * deleted. If the user has no cart yet, the guest cart is simply reassigned.
 */
export function mergeGuestCart(db: Db, guestCartId: string | null, userId: number): void {
  if (!guestCartId) return;
  const guest = findCartId(db, { cartId: guestCartId, userId: null });
  if (!guest) return;

  db.transaction(() => {
    const mine = findCartId(db, { cartId: null, userId });
    if (!mine) {
      db.update(carts).set({ userId }).where(eq(carts.id, guest)).run();
      return;
    }
    const lines = db.select().from(cartItems).where(eq(cartItems.cartId, guest)).all();
    for (const line of lines) {
      db.insert(cartItems)
        .values({ ...line, cartId: mine })
        .onConflictDoUpdate({
          target: [cartItems.cartId, cartItems.shirtId, cartItems.size],
          set: {
            quantity: sql`min(${cartItems.quantity} + excluded.quantity, ${MAX_QUANTITY})`,
            addedAt: sql`min(${cartItems.addedAt}, excluded.added_at)`,
          },
        })
        .run();
    }
    db.delete(carts).where(eq(carts.id, guest)).run();
    touch(db, mine);
  });
}
