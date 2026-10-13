/**
 * The /shirts listing: query parsing, filtering, and sorting (contracts/routes.md). Sorting by
 * complexity happens here on the server; the score itself never leaves CatalogShirt.
 */
import { SHIRT_STYLES, type ShirtStyle } from "@/lib/catalog/types";
import type { CatalogShirt } from "@/lib/data/shirts";
import { cmp, tryParseUsd, type Usd } from "@/lib/money";

export const SORT_KEYS = ["complexity-desc", "complexity-asc", "price-desc", "price-asc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const DEFAULT_SORT: SortKey = "complexity-desc";

export interface ListingQuery {
  tierIds: number[];
  minPriceUsd: Usd | null;
  maxPriceUsd: Usd | null;
  style: ShirtStyle | null;
  sort: SortKey;
}

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

function nonNegativeUsd(value: string | undefined): Usd | null {
  const parsed = value === undefined ? null : tryParseUsd(value);
  return parsed !== null && !parsed.startsWith("-") ? parsed : null;
}

export function parseListingQuery(params: Params): ListingQuery {
  const tierIds = [
    ...new Set(
      all(params.tier)
        .filter((t) => /^[1-9]\d*$/.test(t))
        .map(Number),
    ),
  ];
  const style = first(params.style);
  const sort = first(params.sort);
  return {
    tierIds,
    minPriceUsd: nonNegativeUsd(first(params.minPrice)),
    maxPriceUsd: nonNegativeUsd(first(params.maxPrice)),
    style: SHIRT_STYLES.includes(style as ShirtStyle) ? (style as ShirtStyle) : null,
    sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : DEFAULT_SORT,
  };
}

const byName = (a: CatalogShirt, b: CatalogShirt) => a.name.localeCompare(b.name);
const byComplexity = (a: CatalogShirt, b: CatalogShirt) => a.complexity - b.complexity;
const byPrice = (a: CatalogShirt, b: CatalogShirt) => cmp(a.finalPriceUsd, b.finalPriceUsd);

const COMPARATORS: Record<SortKey, (a: CatalogShirt, b: CatalogShirt) => number> = {
  "complexity-desc": (a, b) => byComplexity(b, a) || byPrice(b, a) || byName(a, b),
  "complexity-asc": (a, b) => byComplexity(a, b) || byPrice(a, b) || byName(a, b),
  "price-desc": (a, b) => byPrice(b, a) || byComplexity(b, a) || byName(a, b),
  "price-asc": (a, b) => byPrice(a, b) || byComplexity(a, b) || byName(a, b),
};

export function applyListing(shirts: readonly CatalogShirt[], query: ListingQuery): CatalogShirt[] {
  return shirts
    .filter((s) => s.status === "active")
    .filter((s) => query.tierIds.length === 0 || query.tierIds.includes(s.tier.id))
    .filter((s) => query.style === null || s.style === query.style)
    .filter((s) => query.minPriceUsd === null || cmp(s.finalPriceUsd, query.minPriceUsd) >= 0)
    .filter((s) => query.maxPriceUsd === null || cmp(s.finalPriceUsd, query.maxPriceUsd) <= 0)
    .sort(COMPARATORS[query.sort]);
}

/** Home page picks: the owner's featured shirts, else the top `count` by complexity. */
export function featuredShirts(shirts: readonly CatalogShirt[], count = 4): CatalogShirt[] {
  const active = applyListing(shirts, { ...EMPTY_QUERY });
  const picked = active.filter((s) => s.featured);
  return (picked.length ? picked : active).slice(0, count);
}

/** The empty-cart spotlight: the priciest active shirt. */
export function mostExpensive(shirts: readonly CatalogShirt[]): CatalogShirt | null {
  return applyListing(shirts, { ...EMPTY_QUERY, sort: "price-desc" })[0] ?? null;
}

const EMPTY_QUERY: ListingQuery = {
  tierIds: [],
  minPriceUsd: null,
  maxPriceUsd: null,
  style: null,
  sort: DEFAULT_SORT,
};
