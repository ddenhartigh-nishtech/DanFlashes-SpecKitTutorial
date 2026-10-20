/**
 * Carts (data-model: carts, cart_items). Carts never store prices — every view resolves them live
 * from the catalog (FR-028). Lines for deactivated shirts are removed by the cart audit (FR-016).
 * While bland-shirt shaming is on, a BLAND shirt can't be in a cart at all (002 FR-010): adds and
 * quantity raises are refused, sign-in merges leave bland lines behind, and the audit pulls any
 * that are already there. A one-of-a-kind shirt (007 FR-018) goes only in its maker's cart: anyone
 * else's add or raise is refused, and the audit takes out any such line that got there anyway.
 */
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { MAX_QUANTITY } from "@/lib/cart/limits";
import { canBuy } from "@/lib/catalog/one-of-a-kind";
import { SIZES, type Size } from "@/lib/catalog/types";
import { getSettings } from "@/lib/data/settings";
import {
  findShirtRef,
  getCatalogShirtsByIds,
  getShirtRefsByIds,
  isBlandShirt,
  toShopperShirt,
  type CatalogShirt,
  type ShopperShirt,
} from "@/lib/data/shirts";
import type { Db } from "@/lib/db/client";
import { cartItems, carts } from "@/lib/db/schema";
import { cmp, mul, sum, ZERO, type Usd } from "@/lib/money";
import type { Err, Ok } from "@/lib/result";

export { MAX_QUANTITY };

export type CartErrorCode =
  | "SIZE_REQUIRED"
  | "SHIRT_NOT_FOUND"
  | "SHIRT_INACTIVE"
  | "NOT_IN_CART"
  | "INVALID_QUANTITY"
  | "BLAND_REFUSED"
  | "NOT_YOURS";

export type CartResult = Ok<{ itemCount: number }> | Err<CartErrorCode>;
/** An add or an update also says which shirt changed and what its quantity was (004 R3). */
export type CartChange =
  Ok<{ itemCount: number; shirtId: number; previousQuantity: number }> | Err<CartErrorCode>;

export interface CartOwner {
  cartId: string | null;
  userId: number | null;
}

/**
 * Why the audit pulled a line: the shirt was retired, it's bland while shaming is on, or it's one of
 * a kind and this cart isn't its maker's (007 R14).
 */
export type RemovalReason = "retired" | "bland" | "unique";

export interface RemovedLine {
  slug: string;
  name: string;
  size: Size;
  quantity: number;
  reason: RemovalReason;
}

export interface CartLine {
  shirt: ShopperShirt;
  size: Size;
  quantity: number;
  addedAt: string;
  lineTotalUsd: Usd;
  /** The Uniquity Surcharge per shirt on this line (007 FR-027): "0.00" unless one of a kind. */
  surchargeUsd: Usd;
}

/** Server-only line shape (carries the CatalogShirt) for checkout. */
export interface CheckoutLine {
  shirt: CatalogShirt;
  size: Size;
  quantity: number;
  addedAt: string;
  lineTotalUsd: Usd;
  surchargeUsd: Usd;
}

export interface CartView {
  cartId: string | null;
  lines: CartLine[];
  itemCount: number;
  subtotalUsd: Usd;
  /** Every Uniquity Surcharge in the cart, in all, and how many shirts pay one (007 FR-027). */
  surchargeUsd: Usd;
  surchargeCount: number;
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

/** The account a cart belongs to, or null for a guest's. */
function ownerOf(db: Db, cartId: string): number | null {
  return (
    db.select({ userId: carts.userId }).from(carts).where(eq(carts.id, cartId)).get()?.userId ??
    null
  );
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

export function addItem(db: Db, cartId: string, input: { slug: string; size: string }): CartChange {
  if (!isSize(input.size)) return { ok: false, code: "SIZE_REQUIRED" };
  const shirt = findShirtRef(db, input.slug);
  if (!shirt) return { ok: false, code: "SHIRT_NOT_FOUND" };
  if (shirt.status !== "active") return { ok: false, code: "SHIRT_INACTIVE" };
  if (!canBuy(shirt, ownerOf(db, cartId))) return { ok: false, code: "NOT_YOURS" };
  if (refusesBland(db, shirt.id)) return { ok: false, code: "BLAND_REFUSED" };

  const previousQuantity =
    db
      .select({ quantity: cartItems.quantity })
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.shirtId, shirt.id),
          eq(cartItems.size, input.size),
        ),
      )
      .get()?.quantity ?? 0;
  db.insert(cartItems)
    .values({ cartId, shirtId: shirt.id, size: input.size, quantity: 1 })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.shirtId, cartItems.size],
      set: { quantity: sql`min(${cartItems.quantity} + 1, ${MAX_QUANTITY})` },
    })
    .run();
  touch(db, cartId);
  return { ok: true, itemCount: itemCount(db, cartId), shirtId: shirt.id, previousQuantity };
}

/** Bland-shirt shaming (FR-010): while it's on, a BLAND shirt may not enter or grow in a cart. */
function refusesBland(db: Db, shirtId: number): boolean {
  return getSettings(db).blandShaming && isBlandShirt(db, shirtId);
}

function findLine(db: Db, cartId: string, slug: string, size: string) {
  const shirt = findShirtRef(db, slug);
  if (!shirt || !isSize(size)) return null;
  const where = and(
    eq(cartItems.cartId, cartId),
    eq(cartItems.shirtId, shirt.id),
    eq(cartItems.size, size),
  );
  const line = db.select().from(cartItems).where(where).get();
  return line ? { where, line, shirt } : null;
}

export function updateItem(
  db: Db,
  cartId: string,
  input: { slug: string; size: string; quantity: number },
): CartChange {
  if (!Number.isInteger(input.quantity) || input.quantity < 0 || input.quantity > MAX_QUANTITY) {
    return { ok: false, code: "INVALID_QUANTITY" };
  }
  const found = findLine(db, cartId, input.slug, input.size);
  if (!found) return { ok: false, code: "NOT_IN_CART" };
  const { where, line, shirt } = found;
  if (input.quantity > line.quantity && !canBuy(shirt, ownerOf(db, cartId))) {
    return { ok: false, code: "NOT_YOURS" };
  }
  if (input.quantity > line.quantity && refusesBland(db, line.shirtId)) {
    return { ok: false, code: "BLAND_REFUSED" };
  }
  if (input.quantity === 0) db.delete(cartItems).where(where).run();
  else db.update(cartItems).set({ quantity: input.quantity }).where(where).run();
  touch(db, cartId);
  return {
    ok: true,
    itemCount: itemCount(db, cartId),
    shirtId: line.shirtId,
    previousQuantity: line.quantity,
  };
}

export function removeItem(
  db: Db,
  cartId: string,
  input: { slug: string; size: string },
): CartResult {
  return updateItem(db, cartId, { ...input, quantity: 0 });
}

/** Delete lines for deactivated shirts, and bland ones while shaming is on, and report them. */
export function auditCart(db: Db, cartId: string | null): RemovedLine[] {
  if (!cartId) return [];
  const lines = db.select().from(cartItems).where(eq(cartItems.cartId, cartId)).all();
  const refs = getShirtRefsByIds(
    db,
    lines.map((l) => l.shirtId),
  );
  const blandShaming = getSettings(db).blandShaming;
  const owner = ownerOf(db, cartId);
  const reasonFor = (shirtId: number): RemovalReason | null => {
    const ref = refs.get(shirtId);
    if (!ref || ref.status === "inactive") return "retired";
    if (!canBuy(ref, owner)) return "unique";
    return blandShaming && isBlandShirt(db, shirtId) ? "bland" : null;
  };
  const doomed = lines.flatMap((line) => {
    const reason = reasonFor(line.shirtId);
    if (!reason) return [];
    const ref = refs.get(line.shirtId);
    return [
      {
        shirtId: line.shirtId,
        slug: ref?.slug ?? "",
        name: ref?.name ?? "",
        size: line.size,
        quantity: line.quantity,
        reason,
      },
    ];
  });
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
  return doomed.map(({ slug, name, size, quantity, reason }) => ({
    slug,
    name,
    size,
    quantity,
    reason,
  }));
}

/**
 * Current lines with live catalog prices and surcharges, newest first. Does not audit. Carts never
 * store money: the surcharge, like the price, is whatever the settings say right now (R15).
 */
export function loadCheckoutLines(db: Db, cartId: string): CheckoutLine[] {
  const settings = getSettings(db);
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
      surchargeUsd:
        shirt.oneOfAKind && settings.uniquitySurcharge ? settings.uniquitySurchargeUsd : ZERO,
    };
  });
}

/** Every surcharge on these lines, in all, and how many shirts pay one. */
export function surchargeOf(lines: readonly { quantity: number; surchargeUsd: Usd }[]): {
  surchargeUsd: Usd;
  surchargeCount: number;
} {
  const charged = lines.filter((l) => cmp(l.surchargeUsd, ZERO) > 0);
  return {
    surchargeUsd: sum(charged.map((l) => mul(l.surchargeUsd, l.quantity))),
    surchargeCount: charged.reduce((n, l) => n + l.quantity, 0),
  };
}

/** The shopper's cart: audits first, then resolves live prices (FR-015, FR-016). */
export function getCartView(db: Db, cartId: string | null): CartView {
  if (!cartId) {
    return {
      cartId: null,
      lines: [],
      itemCount: 0,
      subtotalUsd: ZERO,
      surchargeUsd: ZERO,
      surchargeCount: 0,
      removed: [],
    };
  }
  const removed = auditCart(db, cartId);
  const lines = loadCheckoutLines(db, cartId).map((line) => ({
    shirt: toShopperShirt(line.shirt),
    size: line.size,
    quantity: line.quantity,
    addedAt: line.addedAt,
    lineTotalUsd: line.lineTotalUsd,
    surchargeUsd: line.surchargeUsd,
  }));
  return {
    cartId,
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotalUsd: sum(lines.map((l) => l.lineTotalUsd)),
    ...surchargeOf(lines),
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
    // Bland-shirt shaming (FR-010): the guest's bland lines stay behind.
    if (getSettings(db).blandShaming) {
      const bland = db
        .select({ shirtId: cartItems.shirtId })
        .from(cartItems)
        .where(eq(cartItems.cartId, guest))
        .all()
        .map((r) => r.shirtId)
        .filter((id) => isBlandShirt(db, id));
      if (bland.length) {
        db.delete(cartItems)
          .where(and(eq(cartItems.cartId, guest), inArray(cartItems.shirtId, bland)))
          .run();
      }
    }

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
