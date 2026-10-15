import "server-only";
import { connection } from "next/server";
import { loadStockOf } from "@/app/_data/urgency";
import { getPlaceholderUrl, getSettings } from "@/lib/data/settings";
import { getShirtBySlug, listCatalogShirts } from "@/lib/data/shirts";
import { listTiers } from "@/lib/data/tiers";
import { getDb } from "@/lib/db/client";
import { buildLadder } from "@/lib/shaming/ladder";

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
    /** Each shirt's stock line for this shopper (004 US1). */
    stockOf: await loadStockOf(db, settings),
  };
}

/**
 * One shirt by slug (any status), the placeholder URL, and the shaming switches. For a BLAND shirt
 * while shaming is on, also the ladder of complicated shirts to recommend instead (002 US1).
 * Request-time; use inside <Suspense>.
 */
export async function loadShirt(slug: string) {
  await connection();
  const db = getDb();
  const settings = getSettings(db);
  const shirt = getShirtBySlug(db, slug);
  const shamed = Boolean(shirt?.tier.isBland && settings.blandShaming);
  const stockOf = await loadStockOf(db, settings);
  return {
    shirt,
    stock: shirt ? stockOf(shirt) : null,
    countdownTimers: settings.countdownTimers,
    placeholderUrl: getPlaceholderUrl(db, settings),
    blandShaming: settings.blandShaming,
    confirmshaming: settings.confirmshaming,
    ladder: shamed ? buildLadder(listCatalogShirts(db)) : [],
  };
}
