import { describe, expect, it } from "vitest";
import {
  DEFAULT_SORT,
  applyListing,
  featuredShirts,
  mostExpensive,
  parseListingQuery,
  type ListingQuery,
} from "@/lib/catalog/listing";
import type { CatalogShirt } from "@/lib/data/shirts";

const tierBadge = (id: number, name: string) => ({
  id,
  name,
  tagline: null,
  badgeBgColor: "#FFFFFF",
  badgeTextColor: "#000000",
  isBland: id === 1,
});

function shirt(
  slug: string,
  complexity: number,
  finalPriceUsd: string,
  tierId: number,
  extra: Partial<CatalogShirt> = {},
): CatalogShirt {
  return {
    id: complexity,
    slug,
    name: slug,
    style: "polo",
    description: "",
    status: "active",
    featured: false,
    complexity,
    finalPriceUsd,
    msrpUsd: finalPriceUsd,
    tier: tierBadge(tierId, `T${tierId}`),
    images: [],
    ...extra,
  };
}

const SHIRTS: CatalogShirt[] = [
  shirt("beige", 2, "157.39", 1),
  shirt("khaki", 6, "196.95", 1, { style: "button-down" }),
  shirt("geo", 12, "344.62", 2),
  shirt("tugger", 34, "1583.66", 3, { style: "button-down" }),
  shirt("tax", 22, "1040.00", 2, { style: "button-down" }),
  shirt("masterpiece", 130, "1228800.00", 6),
  shirt("retired", 30, "1231.36", 3, { status: "inactive" }),
];

const q = (patch: Partial<ListingQuery> = {}): ListingQuery => ({
  tierIds: [],
  minPriceUsd: null,
  maxPriceUsd: null,
  style: null,
  sort: DEFAULT_SORT,
  ...patch,
});

const slugs = (list: CatalogShirt[]) => list.map((s) => s.slug);

describe("parseListingQuery", () => {
  it("returns defaults for an empty query", () => {
    expect(parseListingQuery({})).toEqual(q());
    expect(DEFAULT_SORT).toBe("complexity-desc");
  });

  it("parses repeatable tier ids, money with optional cents, style, and sort", () => {
    expect(
      parseListingQuery({
        tier: ["4", "5", "4"],
        minPrice: "299.99",
        maxPrice: "5000",
        style: "button-down",
        sort: "price-asc",
      }),
    ).toEqual(
      q({
        tierIds: [4, 5],
        minPriceUsd: "299.99",
        maxPriceUsd: "5000.00",
        style: "button-down",
        sort: "price-asc",
      }),
    );
    expect(parseListingQuery({ tier: "1" }).tierIds).toEqual([1]);
  });

  it("ignores invalid values instead of failing", () => {
    expect(
      parseListingQuery({
        tier: ["abc", "-2", "0", "1.5"],
        minPrice: "cheap",
        maxPrice: "-5",
        style: "tank-top",
        sort: "random",
      }),
    ).toEqual(q());
  });
});

describe("applyListing", () => {
  it("excludes inactive shirts", () => {
    expect(slugs(applyListing(SHIRTS, q()))).not.toContain("retired");
  });

  it("sorts Most Complicated first by default", () => {
    expect(slugs(applyListing(SHIRTS, q()))).toEqual([
      "masterpiece",
      "tugger",
      "tax",
      "geo",
      "khaki",
      "beige",
    ]);
  });

  it("sorts Least Complicated first", () => {
    expect(slugs(applyListing(SHIRTS, q({ sort: "complexity-asc" })))[0]).toBe("beige");
  });

  it("sorts by price exactly, including huge values", () => {
    expect(slugs(applyListing(SHIRTS, q({ sort: "price-desc" })))).toEqual([
      "masterpiece",
      "tugger",
      "tax",
      "geo",
      "khaki",
      "beige",
    ]);
    expect(slugs(applyListing(SHIRTS, q({ sort: "price-asc" })))[5]).toBe("masterpiece");
  });

  it("filters by tier ids (BLAND is just tier 1)", () => {
    expect(slugs(applyListing(SHIRTS, q({ tierIds: [1] })))).toEqual(["khaki", "beige"]);
    expect(slugs(applyListing(SHIRTS, q({ tierIds: [2, 6] })))).toEqual([
      "masterpiece",
      "tax",
      "geo",
    ]);
  });

  it("filters by an inclusive price range", () => {
    expect(
      slugs(applyListing(SHIRTS, q({ minPriceUsd: "344.62", maxPriceUsd: "1583.66" }))),
    ).toEqual(["tugger", "tax", "geo"]);
  });

  it("filters by style", () => {
    expect(slugs(applyListing(SHIRTS, q({ style: "button-down" })))).toEqual([
      "tugger",
      "tax",
      "khaki",
    ]);
  });

  it("ANDs every active filter", () => {
    expect(
      slugs(
        applyListing(SHIRTS, q({ tierIds: [2, 3], style: "button-down", maxPriceUsd: "1500.00" })),
      ),
    ).toEqual(["tax"]);
  });

  it("breaks ties deterministically by name", () => {
    const tied = [shirt("b-shirt", 20, "500.00", 2), shirt("a-shirt", 20, "500.00", 2)];
    expect(slugs(applyListing(tied, q()))).toEqual(["a-shirt", "b-shirt"]);
    expect(slugs(applyListing(tied, q({ sort: "price-asc" })))).toEqual(["a-shirt", "b-shirt"]);
  });
});

describe("featuredShirts", () => {
  it("defaults to the top 4 active shirts by complexity", () => {
    expect(slugs(featuredShirts(SHIRTS))).toEqual(["masterpiece", "tugger", "tax", "geo"]);
  });

  it("uses the owner's featured picks when any are set (active only)", () => {
    const picked = SHIRTS.map((s) =>
      s.slug === "khaki" || s.slug === "retired" ? { ...s, featured: true } : s,
    );
    expect(slugs(featuredShirts(picked))).toEqual(["khaki"]);
  });
});

describe("mostExpensive", () => {
  it("returns the priciest active shirt, or null when there are none", () => {
    expect(mostExpensive(SHIRTS)?.slug).toBe("masterpiece");
    expect(mostExpensive([SHIRTS[6]])).toBeNull();
  });
});
