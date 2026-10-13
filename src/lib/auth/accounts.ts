import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { Err, Ok } from "@/lib/result";

export const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export type SignUpResult =
  Ok<{ userId: number }> | Err<"INVALID_EMAIL" | "WEAK_PASSWORD" | "EMAIL_TAKEN">;
export type SignInResult = Ok<{ userId: number }> | Err<"BAD_CREDENTIALS">;

export async function signUp(
  db: Db,
  input: { email: string; password: string; displayName: string | null },
): Promise<SignUpResult> {
  const email = normalizeEmail(input.email);
  if (!EMAIL_RE.test(email)) return { ok: false, code: "INVALID_EMAIL" };
  if (input.password.length < MIN_PASSWORD_LENGTH) return { ok: false, code: "WEAK_PASSWORD" };
  if (db.select({ id: users.id }).from(users).where(eq(users.email, email)).get()) {
    return { ok: false, code: "EMAIL_TAKEN" };
  }
  const passwordHash = await hashPassword(input.password);
  const displayName = input.displayName?.trim() || null;
  const { id } = db
    .insert(users)
    .values({ email, passwordHash, displayName })
    .returning({ id: users.id })
    .get();
  return { ok: true, userId: id };
}

export async function signIn(
  db: Db,
  input: { email: string; password: string },
): Promise<SignInResult> {
  const user = db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, normalizeEmail(input.email)))
    .get();
  const valid = await verifyPassword(input.password, user?.passwordHash ?? null);
  return valid && user ? { ok: true, userId: user.id } : { ok: false, code: "BAD_CREDENTIALS" };
}
