import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { findSessionUser, type SessionUser } from "@/lib/auth/session";
import { findCartId } from "@/lib/cart/cart";
import { getDb } from "@/lib/db/client";
import { CART_COOKIE, SESSION_COOKIE, type CookieJar } from "@/lib/http/cookies";

/** Adapts Next's cookie store to the framework-free CookieJar used by src/lib/actions. */
export async function cookieJar(): Promise<CookieJar> {
  const store = await cookies();
  return {
    get: (name) => store.get(name)?.value,
    set: (name, value, options) => store.set(name, value, options),
    delete: (name) => store.delete(name),
  };
}

/** Request-time reads for pages; callers must sit inside a <Suspense> boundary. */
export async function currentUser(): Promise<SessionUser | null> {
  await connection();
  const store = await cookies();
  return findSessionUser(getDb(), store.get(SESSION_COOKIE)?.value);
}

export async function currentCartId(): Promise<string | null> {
  const user = await currentUser();
  const store = await cookies();
  return findCartId(getDb(), {
    cartId: store.get(CART_COOKIE)?.value ?? null,
    userId: user?.id ?? null,
  });
}
