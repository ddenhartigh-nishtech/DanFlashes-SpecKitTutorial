/**
 * What a console action hands back (008 contracts/console.md): calm on success, gentle and
 * specific on a refusal. Every action starts with `asAdmin`, so hiding a page is never the only
 * protection (FR-003).
 */
import { findSessionUser, type SessionUser } from "@/lib/auth/session";
import type { Issue } from "@/lib/catalog/validate";
import { copy } from "@/lib/copy";
import type { Db } from "@/lib/db/client";
import { SESSION_COOKIE, type CookieJar } from "@/lib/http/cookies";

export type ConsoleState =
  | { ok: true; message: string; id?: number }
  | { ok: false; message: string; issues?: Issue[]; link?: { href: string; label: string } };

export const saved = (message: string = copy.console.saved): ConsoleState => ({
  ok: true,
  message,
});

/** A refusal: one plain message, and the field-by-field reasons when there are some. */
export function refused(message: string, issues?: Issue[]): ConsoleState {
  return issues?.length ? { ok: false, message, issues } : { ok: false, message };
}

/** A refusal listing what needs a look. */
export const problems = (issues: Issue[]): ConsoleState =>
  refused(copy.console.refused.problems, issues);

/**
 * The signed-in admin, or the refusal to return instead: "sign in again" when there's no session,
 * and a plain "not available" for a shopper, who has no business knowing the console exists.
 */
export function asAdmin(
  db: Db,
  jar: CookieJar,
): { admin: SessionUser; refusal?: never } | { admin?: never; refusal: ConsoleState } {
  const user = findSessionUser(db, jar.get(SESSION_COOKIE));
  if (!user) return { refusal: refused(copy.console.refused.signIn) };
  if (!user.isAdmin) return { refusal: refused(copy.console.refused.notFound) };
  return { admin: user };
}

/** Read a text field (absent → ""). */
export const text = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

/** Read a positive integer id, or null. */
export function id(form: FormData, name: string): number | null {
  const raw = text(form, name).trim();
  return /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : null;
}
