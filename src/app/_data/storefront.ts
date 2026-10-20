import "server-only";
import { connection } from "next/server";
import { currentUser } from "@/app/_data/request";
import { loadStockOf } from "@/app/_data/urgency";
import { canBuy } from "@/lib/catalog/one-of-a-kind";
import { getPlaceholderUrl, getSettings } from "@/lib/data/settings";
import { getShirtBySlug, listCatalogShirts } from "@/lib/data/shirts";
import { listTiers } from "@/lib/data/tiers";
import { getDb } from "@/lib/db/client";
import { buildLadder } from "@/lib/shaming/ladder";
import { socialProofFor } from "@/lib/urgency/social-proof";

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
  const viewer = await currentUser();
  return {
    shirt,
    /** Made to order for its maker only (007 FR-018): may this shopper buy it? */
    buyable: shirt ? canBuy(shirt, viewer?.id ?? null) : false,
    signedIn: viewer !== null,
    /** The Uniquity Surcharge per shirt, when it applies to this one (007 FR-027). */
    surchargeUsd:
      shirt?.oneOfAKind && settings.uniquitySurcharge ? settings.uniquitySurchargeUsd : null,
    dialOn: settings.patternGenerator,
    stock: shirt ? stockOf(shirt) : null,
    countdownTimers: settings.countdownTimers,
    /** Who's looking and who just bought it (004 US3), worked out at request time. */
    proof: shirt
      ? socialProofFor(
          settings,
          {
            id: shirt.id,
            isBland: shirt.tier.isBland,
            active: shirt.status === "active",
            oneOfAKind: shirt.oneOfAKind,
          },
          Date.now(),
        )
      : null,
    placeholderUrl: getPlaceholderUrl(db, settings),
    blandShaming: settings.blandShaming,
    confirmshaming: settings.confirmshaming,
    ladder: shamed ? buildLadder(listCatalogShirts(db)) : [],
  };
}
