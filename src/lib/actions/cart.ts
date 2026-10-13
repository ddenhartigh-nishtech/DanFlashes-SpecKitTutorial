/** Cart action logic (contracts/actions.md → Cart). The Next.js adapters live in src/actions/. */
import { field, failure, sessionUser, type ActionState } from "@/lib/actions/state";
import {
  addItem,
  findCartId,
  getOrCreateCart,
  removeItem,
  updateItem,
  type CartResult,
} from "@/lib/cart/cart";
import { copy } from "@/lib/copy";
import type { Db } from "@/lib/db/client";
import { CART_COOKIE, cookieOptions, type CookieJar } from "@/lib/http/cookies";

const GUEST_CART_DAYS = 30;

function toState(result: CartResult, message?: string): ActionState {
  if (!result.ok) return failure(result.code);
  return message
    ? { ok: true, itemCount: result.itemCount, message }
    : { ok: true, itemCount: result.itemCount };
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
  return toState(result, copy.product.added);
}

export function updateCartItemCore(db: Db, jar: CookieJar, form: FormData): ActionState {
  const cartId = findCartId(db, owner(db, jar));
  if (!cartId) return failure("NOT_IN_CART");
  const raw = field(form, "quantity").trim();
  const quantity = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  return toState(
    updateItem(db, cartId, { slug: field(form, "slug"), size: field(form, "size"), quantity }),
  );
}

export function removeCartItemCore(db: Db, jar: CookieJar, form: FormData): ActionState {
  const cartId = findCartId(db, owner(db, jar));
  if (!cartId) return failure("NOT_IN_CART");
  return toState(removeItem(db, cartId, { slug: field(form, "slug"), size: field(form, "size") }));
}
