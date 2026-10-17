/**
 * The owner (008 FR-001, R3): any account with the admin flag. The flag is set and cleared only
 * from the command line (scripts/admin.ts); nothing in the store or the console changes it.
 */
import { eq } from "drizzle-orm";
import { normalizeEmail } from "@/lib/auth/accounts";
import { findSessionUser, type SessionUser } from "@/lib/auth/session";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { SESSION_COOKIE, type CookieJar } from "@/lib/http/cookies";

export type SetAdminResult = { ok: true; changed: boolean } | { ok: false };

export function setAdmin(db: Db, email: string, on: boolean): SetAdminResult {
  const user = db
    .select({ id: users.id, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .get();
  if (!user) return { ok: false };
  if (user.isAdmin === on) return { ok: true, changed: false };
  db.update(users).set({ isAdmin: on }).where(eq(users.id, user.id)).run();
  return { ok: true, changed: true };
}

/** The signed-in admin, or null for a guest or a shopper. Every console action starts here. */
export function adminUser(db: Db, jar: CookieJar): SessionUser | null {
  const user = findSessionUser(db, jar.get(SESSION_COOKIE));
  return user?.isAdmin ? user : null;
}
