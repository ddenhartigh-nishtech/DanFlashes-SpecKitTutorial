/** Auth action logic (contracts/actions.md → Auth). The Next.js adapters live in src/actions/. */
import { field, failure, type ActionState } from "@/lib/actions/state";
import { signIn, signUp } from "@/lib/auth/accounts";
import { safeNext } from "@/lib/auth/safe-next";
import { createSession, deleteSession, SESSION_TTL_DAYS } from "@/lib/auth/session";
import { mergeGuestCart } from "@/lib/cart/cart";
import type { Db } from "@/lib/db/client";
import { CART_COOKIE, SESSION_COOKIE, cookieOptions, type CookieJar } from "@/lib/http/cookies";

/** Start a session and fold the guest cart into the account (FR-022). */
function startSession(db: Db, jar: CookieJar, userId: number): void {
  const { token } = createSession(db, userId);
  jar.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_DAYS));
  mergeGuestCart(db, jar.get(CART_COOKIE) ?? null, userId);
  jar.delete(CART_COOKIE);
}

export async function signUpCore(db: Db, jar: CookieJar, form: FormData): Promise<ActionState> {
  const result = await signUp(db, {
    email: field(form, "email"),
    password: field(form, "password"),
    displayName: field(form, "displayName") || null,
  });
  if (!result.ok) return failure(result.code);
  startSession(db, jar, result.userId);
  return { ok: true, redirectTo: safeNext(field(form, "next")) };
}

export async function signInCore(db: Db, jar: CookieJar, form: FormData): Promise<ActionState> {
  const result = await signIn(db, {
    email: field(form, "email"),
    password: field(form, "password"),
  });
  if (!result.ok) return failure(result.code);
  startSession(db, jar, result.userId);
  return { ok: true, redirectTo: safeNext(field(form, "next")) };
}

export function signOutCore(db: Db, jar: CookieJar): void {
  deleteSession(db, jar.get(SESSION_COOKIE));
  jar.delete(SESSION_COOKIE);
}
