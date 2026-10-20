/** Cart action logic (contracts/actions.md → Cart). The Next.js adapters live in src/actions/. */
import { field, failure, sessionUser, type ActionState } from "@/lib/actions/state";
import {
  addItem,
  findCartId,
  getOrCreateCart,
  removeItem,
  updateItem,
  type CartChange,
  type CartResult,
} from "@/lib/cart/cart";
import { MAX_QUANTITY } from "@/lib/cart/limits";
import { copy } from "@/lib/copy";
import { getSettings } from "@/lib/data/settings";
import { getCatalogShirtsByIds, isBlandShirt } from "@/lib/data/shirts";
import type { Db } from "@/lib/db/client";
import { CART_COOKIE, cookieOptions, type CookieJar } from "@/lib/http/cookies";
import { foundAnother, makesAnother } from "@/lib/urgency/scarcity";

const GUEST_CART_DAYS = 30;

function toState(result: CartResult, message?: string): ActionState {
  if (!result.ok) return failure(result.code);
  return message
    ? { ok: true, itemCount: result.itemCount, message }
    : { ok: true, itemCount: result.itemCount };
}

/**
 * Fake scarcity (004 FR-009): what this add says. Another one "found", or for a one-of-a-kind
 * shirt another one made (007 FR-026), or nothing past "added".
 */
function addMessage(db: Db, result: Extract<CartChange, { ok: true }>, next: number): string {
  const change = {
    previous: result.previousQuantity,
    next,
    isBland: isBlandShirt(db, result.shirtId),
    madeToOrder: getCatalogShirtsByIds(db, [result.shirtId]).get(result.shirtId)?.oneOfAKind,
  };
  const on = getSettings(db).fakeScarcity;
  if (makesAnother(change, on)) return `${copy.product.added} ${copy.urgency.makeAnother}`;
  if (foundAnother(change, on)) return `${copy.product.added} ${copy.urgency.foundAnother}`;
  return copy.product.added;
}

function owner(db: Db, jar: CookieJar) {
  return { cartId: jar.get(CART_COOKIE) ?? null, userId: sessionUser(db, jar)?.id ?? null };
}

export function addToCartCore(db: Db, jar: CookieJar, form: FormData): ActionState {
  const who = owner(db, jar);
  const cart = getOrCreateCart(db, who);
  if (cart.created && who.userId === null) {
    jar.set(CART_COOKIE, cart.id, cookieOptions(GUEST_CART_DAYS));
  }
  const result = addItem(db, cart.id, { slug: field(form, "slug"), size: field(form, "size") });
  if (!result.ok) return failure(result.code);
  const next = Math.min(result.previousQuantity + 1, MAX_QUANTITY);
  return { ok: true, itemCount: result.itemCount, message: addMessage(db, result, next) };
}

export function updateCartItemCore(db: Db, jar: CookieJar, form: FormData): ActionState {
  const cartId = findCartId(db, owner(db, jar));
  if (!cartId) return failure("NOT_IN_CART");
  const raw = field(form, "quantity").trim();
  const quantity = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  const result = updateItem(db, cartId, {
    slug: field(form, "slug"),
    size: field(form, "size"),
    quantity,
  });
  // A raise says nothing: the line's own stock line has its say (004, owner 2026-10-16).
  return toState(result);
}

export function removeCartItemCore(db: Db, jar: CookieJar, form: FormData): ActionState {
  const cartId = findCartId(db, owner(db, jar));
  if (!cartId) return failure("NOT_IN_CART");
  return toState(removeItem(db, cartId, { slug: field(form, "slug"), size: field(form, "size") }));
}
