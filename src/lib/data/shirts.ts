/**
 * Shirt reads. `CatalogShirt` is server-only and carries the complexity score (for sorting and
 * tiers) and the MSRP. Anything sent toward the browser goes through `toShopperShirt`, which
 * strips both — shoppers never see the score (constitution II, FR-002).
 */
import { asc, eq, inArray } from "drizzle-orm";
import { isBlandTier, tierOf } from "@/lib/catalog/tiers";
import type { ShirtStatus, ShirtStyle, StoreSettings, Tier } from "@/lib/catalog/types";
import { getSettings } from "@/lib/data/settings";
import { listTiers } from "@/lib/data/tiers";
import type { Db } from "@/lib/db/client";
import { media, shirtImages, shirts } from "@/lib/db/schema";
import { resolveMediaUrl } from "@/lib/media";
import type { Usd } from "@/lib/money";
import { resolvePrice } from "@/lib/pricing/resolve";

export interface ShirtImageView {
  url: string;
  alt: string;
}

export interface TierBadge {
  id: number;
  name: string;
  tagline: string | null;
  badgeBgColor: string;
  badgeTextColor: string;
  isBland: boolean;
}

export interface ShopperShirt {
  id: number;
  slug: string;
  name: string;
  style: ShirtStyle;
  description: string;
  status: ShirtStatus;
  featured: boolean;
  finalPriceUsd: Usd;
  tier: TierBadge;
  images: ShirtImageView[];
}

/** Server-only: never pass this to a Client Component or render `complexity`. */
export interface CatalogShirt extends ShopperShirt {
  complexity: number;
  msrpUsd: Usd;
}

type ShirtRow = typeof shirts.$inferSelect;

function badgeFor(tier: Tier): TierBadge {
  return {
    id: tier.id,
    name: tier.name,
    tagline: tier.tagline,
    badgeBgColor: tier.badgeBgColor,
    badgeTextColor: tier.badgeTextColor,
    isBland: isBlandTier(tier),
  };
}

function loadImages(db: Db, shirtIds: number[], baseUrl: string): Map<number, ShirtImageView[]> {
  const byShirt = new Map<number, ShirtImageView[]>();
  if (shirtIds.length === 0) return byShirt;
  const rows = db
    .select({ shirtId: shirtImages.shirtId, key: media.key, alt: media.alt })
    .from(shirtImages)
    .innerJoin(media, eq(shirtImages.mediaId, media.id))
    .where(inArray(shirtImages.shirtId, shirtIds))
    .orderBy(asc(shirtImages.shirtId), asc(shirtImages.position))
    .all();
  for (const row of rows) {
    const list = byShirt.get(row.shirtId) ?? [];
    list.push({ url: resolveMediaUrl(row.key, baseUrl), alt: row.alt });
    byShirt.set(row.shirtId, list);
  }
  return byShirt;
}

function build(
  row: ShirtRow,
  images: ShirtImageView[],
  settings: StoreSettings,
  tiers: Tier[],
): CatalogShirt {
  const price = resolvePrice(row, settings.msrp);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    style: row.style,
    description: row.description,
    status: row.status,
    featured: row.featured,
    complexity: row.complexity,
    finalPriceUsd: price.finalPriceUsd,
    msrpUsd: price.msrpUsd,
    tier: badgeFor(tierOf(row.complexity, tiers)),
    images,
  };
}

function hydrate(db: Db, rows: ShirtRow[]): CatalogShirt[] {
  const settings = getSettings(db);
  const tiers = listTiers(db);
  const images = loadImages(
    db,
    rows.map((r) => r.id),
    settings.mediaBaseUrl,
  );
  return rows.map((row) => build(row, images.get(row.id) ?? [], settings, tiers));
}

export function listCatalogShirts(
  db: Db,
  options: { includeInactive?: boolean } = {},
): CatalogShirt[] {
  const query = db.select().from(shirts);
  const rows = options.includeInactive
    ? query.all()
    : query.where(eq(shirts.status, "active")).all();
  return hydrate(db, rows);
}

/** Hydrated shirts by id, in any status (used by the cart and checkout). */
export function getCatalogShirtsByIds(db: Db, ids: readonly number[]): Map<number, CatalogShirt> {
  if (ids.length === 0) return new Map();
  const rows = db
    .select()
    .from(shirts)
    .where(inArray(shirts.id, [...ids]))
    .all();
  return new Map(hydrate(db, rows).map((s) => [s.id, s]));
}

export function getShirtBySlug(db: Db, slug: string): CatalogShirt | null {
  const row = db.select().from(shirts).where(eq(shirts.slug, slug)).get();
  return row ? hydrate(db, [row])[0] : null;
}

export function toShopperShirt(shirt: CatalogShirt): ShopperShirt {
  return {
    id: shirt.id,
    slug: shirt.slug,
    name: shirt.name,
    style: shirt.style,
    description: shirt.description,
    status: shirt.status,
    featured: shirt.featured,
    finalPriceUsd: shirt.finalPriceUsd,
    tier: shirt.tier,
    images: shirt.images,
  };
}
