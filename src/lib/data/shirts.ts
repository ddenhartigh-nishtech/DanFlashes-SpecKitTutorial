/**
 * Shirt reads. `CatalogShirt` is server-only and carries the complexity score (for sorting and
 * tiers) and the MSRP. Anything sent toward the browser goes through `toShopperShirt`, which
 * strips both — shoppers never see the score (constitution II, FR-002).
 */
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { isOneOfAKind } from "@/lib/catalog/one-of-a-kind";
import { isBlandTier, tierOf } from "@/lib/catalog/tiers";
import type {
  ShirtOrigin,
  ShirtStatus,
  ShirtStyle,
  StoreSettings,
  Tier,
} from "@/lib/catalog/types";
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
  /** Made to order for the shopper who made it (007 FR-018): nobody else can buy it. */
  oneOfAKind: boolean;
}

/** Server-only: never pass this to a Client Component or render `complexity`. */
export interface CatalogShirt extends ShopperShirt {
  complexity: number;
  msrpUsd: Usd;
  origin: ShirtOrigin;
  listed: boolean;
  /** Who made a dial shirt (007 R14). Never sent to a browser: it's another shopper's account. */
  makerUserId: number | null;
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
    oneOfAKind: isOneOfAKind(row),
    origin: row.origin,
    listed: row.listed,
    makerUserId: row.makerUserId,
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

/**
 * The catalog the store shows around: the listing, the home page, the pop-ups, the shaming loop's
 * picks. A shopper-made shirt stays out until the owner lists it (007 FR-018), and a shirt's own
 * page, carts and orders read shirts directly.
 */
export function listCatalogShirts(
  db: Db,
  options: { includeInactive?: boolean; includeUnlisted?: boolean } = {},
): CatalogShirt[] {
  const rows = db
    .select()
    .from(shirts)
    .where(
      and(
        options.includeInactive ? undefined : eq(shirts.status, "active"),
        options.includeUnlisted ? undefined : eq(shirts.listed, true),
      ),
    )
    .all();
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

/** A shirt's identity, status and who may buy it, without pricing: cart and order bookkeeping. */
export interface ShirtRef {
  id: number;
  slug: string;
  name: string;
  status: ShirtStatus;
  origin: ShirtOrigin;
  listed: boolean;
  makerUserId: number | null;
}

const refColumns = {
  id: shirts.id,
  slug: shirts.slug,
  name: shirts.name,
  status: shirts.status,
  origin: shirts.origin,
  listed: shirts.listed,
  makerUserId: shirts.makerUserId,
};

export function findShirtRef(db: Db, slug: string): ShirtRef | null {
  return db.select(refColumns).from(shirts).where(eq(shirts.slug, slug)).get() ?? null;
}

export function getShirtRefsByIds(db: Db, ids: readonly number[]): Map<number, ShirtRef> {
  if (ids.length === 0) return new Map();
  const rows = db
    .select(refColumns)
    .from(shirts)
    .where(inArray(shirts.id, [...ids]))
    .all();
  return new Map(rows.map((r) => [r.id, r]));
}

/** Whether a shirt sits in the BLAND tier right now. Decided at the moment it's asked. */
export function isBlandShirt(db: Db, shirtId: number): boolean {
  const row = db
    .select({ complexity: shirts.complexity })
    .from(shirts)
    .where(eq(shirts.id, shirtId))
    .get();
  return row ? isBlandTier(tierOf(row.complexity, listTiers(db))) : false;
}

/** Raw owner-side rows (including the complexity score) — for the catalog audit only. */
export function listShirtRows(db: Db): ShirtRow[] {
  return db.select().from(shirts).all();
}

export function countImagesByShirt(db: Db): Map<number, number> {
  return new Map(
    db
      .select({ shirtId: shirtImages.shirtId, n: count() })
      .from(shirtImages)
      .groupBy(shirtImages.shirtId)
      .all()
      .map((r) => [r.shirtId, r.n]),
  );
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
    oneOfAKind: shirt.oneOfAKind,
  };
}

/**
 * The shirts a fake purchase pop-up may name (004 FR-015, FR-016): active and non-bland, by name
 * and slug only. It reads the catalog alone, never orders or shoppers. Empty while it's off.
 */
export function listPopCandidates(
  db: Db,
  settings: Pick<StoreSettings, "socialProof">,
): { name: string; slug: string }[] {
  if (!settings.socialProof) return [];
  return listCatalogShirts(db)
    .filter((shirt) => !shirt.tier.isBland)
    .map((shirt) => ({ name: shirt.name, slug: shirt.slug }));
}
