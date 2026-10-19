import "server-only";
import { notFound } from "next/navigation";
import { currentUser } from "@/app/_data/request";
import type { SessionUser } from "@/lib/auth/session";

/** The signed-in admin, or null. Request-time: callers sit inside a <Suspense> boundary. */
export async function currentAdmin(): Promise<SessionUser | null> {
  const user = await currentUser();
  return user?.isAdmin ? user : null;
}

/**
 * Every console page calls this before it reads anything (008 R2). Next renders a page apart
 * from its layout, and an in-console navigation fetches only the page, so the layout's gate alone
 * can't protect the data. Anyone but an admin gets the store's ordinary 404.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const admin = await currentAdmin();
  if (!admin) notFound();
  return admin;
}
