/**
 * Sessions (research R7): a random 32-byte token lives in the httpOnly `df_session` cookie; only
 * its SHA-256 is stored, so a leaked database can't be replayed as logins.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";

export const SESSION_TTL_DAYS = 30;

export interface SessionUser {
  id: number;
  email: string;
  displayName: string | null;
  /** The owner (008 FR-001): read with every session, so a cleared flag counts at once. */
  isAdmin: boolean;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function createSession(
  db: Db,
  userId: number,
  now: Date = new Date(),
): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 86_400_000).toISOString();
  db.insert(sessions)
    .values({ userId, tokenHash: hashToken(token), expiresAt })
    .run();
  return { token, expiresAt };
}

export function findSessionUser(
  db: Db,
  token: string | undefined | null,
  now: Date = new Date(),
): SessionUser | null {
  if (!token) return null;
  return (
    db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        isAdmin: users.isAdmin,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, now.toISOString())),
      )
      .get() ?? null
  );
}

export function deleteSession(db: Db, token: string | undefined | null): void {
  if (token)
    db.delete(sessions)
      .where(eq(sessions.tokenHash, hashToken(token)))
      .run();
}
