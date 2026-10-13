import "server-only";
import { connection } from "next/server";
import { getPlaceholderUrl, getSettings } from "@/lib/data/settings";
import { listCatalogShirts } from "@/lib/data/shirts";
import { listTiers } from "@/lib/data/tiers";
import { getDb } from "@/lib/db/client";

/**
 * Request-time catalog read for pages. `connection()` is required: better-sqlite3 is synchronous,
 * so without it Cache Components would prerender the catalog at build time and Drizzle Studio
 * edits would never show up. Callers must sit inside a <Suspense> boundary.
 */
export async function loadStorefront() {
  await connection();
  const db = getDb();
  const settings = getSettings(db);
  return {
    shirts: listCatalogShirts(db),
    tiers: listTiers(db),
    placeholderUrl: getPlaceholderUrl(db, settings),
  };
}
