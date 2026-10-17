import { createSession } from "@/lib/auth/session";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { SESSION_COOKIE } from "@/lib/http/cookies";
import { FakeCookieJar } from "./cookies";

let next = 0;

/**
 * An account written straight to the table (no bcrypt, so the console's many tests stay fast),
 * with a signed-in cookie jar. Real sign-up is covered by tests/integration/auth.test.ts.
 */
export function person(
  db: Db,
  {
    admin = false,
    email,
    displayName = null,
  }: { admin?: boolean; email?: string; displayName?: string | null } = {},
) {
  const { id } = db
    .insert(users)
    .values({
      email: email ?? `person-${++next}-${Date.now()}@danflashes.test`,
      passwordHash: "not-a-real-hash",
      displayName,
      isAdmin: admin,
    })
    .returning({ id: users.id })
    .get();
  const { token } = createSession(db, id);
  return { id, jar: new FakeCookieJar({ [SESSION_COOKIE]: token }) };
}

/** Nobody signed in. */
export const guestJar = () => new FakeCookieJar();
