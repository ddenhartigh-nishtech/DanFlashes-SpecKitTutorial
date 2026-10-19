import { describe, expect, it } from "vitest";
import type { CatalogShirt } from "@/lib/data/shirts";
import { buildLadder } from "@/lib/shaming/ladder";
import { lineOrder, recommendationFor, shameFor } from "@/lib/shaming/loop";

function shirt(
  slug: string,
  complexity: number,
  finalPriceUsd: string,
  extra: Partial<CatalogShirt> = {},
): CatalogShirt {
  const isBland = complexity < 10;
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
    tier: {
      id: isBland ? 1 : 2,
      name: isBland ? "BLAND" : "Complicated",
      tagline: null,
      badgeBgColor: "#FFFFFF",
      badgeTextColor: "#000000",
      isBland,
    },
    images: [],
    oneOfAKind: false,
    origin: "catalog",
    listed: true,
    makerUserId: null,
    ...extra,
  };
}

const SHIRTS: CatalogShirt[] = [
  shirt("masterpiece", 130, "1228800.00"),
  shirt("beige", 2, "157.39"),
  shirt("tax", 22, "1040.00"),
  shirt("geo", 12, "344.62"),
  shirt("khaki", 6, "196.95"),
  shirt("retired", 30, "1231.36", { status: "inactive" }),
  shirt("tax-twin", 22, "999.00"),
];

/** A tiny deterministic PRNG (mulberry32) so line orders are repeatable. */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("buildLadder", () => {
  const ladder = buildLadder(SHIRTS);

  it("drops BLAND and inactive shirts and climbs by complexity, one per score", () => {
    expect(ladder.map((s) => s.slug)).toEqual(["geo", "tax", "masterpiece"]);
  });

  it("keeps the pricier shirt when two share a score", () => {
    expect(ladder[1].slug).toBe("tax");
  });

  it("never carries the complexity score or MSRP (constitution II)", () => {
    for (const rung of ladder) {
      expect(rung).not.toHaveProperty("complexity");
      expect(rung).not.toHaveProperty("msrpUsd");
    }
  });

  it("is empty when there is nothing more complicated to offer", () => {
    expect(buildLadder([shirt("beige", 2, "157.39")])).toEqual([]);
  });
});

describe("recommendationFor", () => {
  const ladder = buildLadder(SHIRTS);

  it("starts at the bottom rung on round 1, climbs one rung a round, then stays at the top", () => {
    expect([1, 2, 3, 4, 20].map((round) => recommendationFor(round, ladder)?.slug)).toEqual([
      "geo",
      "tax",
      "masterpiece",
      "masterpiece",
      "masterpiece",
    ]);
  });

  it("is null for an empty ladder", () => {
    expect(recommendationFor(1, [])).toBeNull();
  });
});

describe("lineOrder", () => {
  it("is a permutation of the whole pool", () => {
    const order = lineOrder(8, seeded(1), null);
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("is deterministic for a given random source", () => {
    expect(lineOrder(8, seeded(42), null)).toEqual(lineOrder(8, seeded(42), null));
  });

  it("never opens a new cycle with the line just shown", () => {
    for (let seed = 0; seed < 200; seed++) {
      const random = seeded(seed);
      const previous = seed % 8;
      expect(lineOrder(8, random, previous)[0]).not.toBe(previous);
    }
  });

  it("handles a pool of one", () => {
    expect(lineOrder(1, seeded(3), 0)).toEqual([0]);
  });
});

describe("shameFor", () => {
  const ladder = buildLadder(SHIRTS);

  it.each([
    [true, true, true, "Yes, I'd rather blend in"],
    [true, true, false, "Yes, I'm sure"],
    [true, false, true, null],
    [true, false, false, null],
    [false, true, true, null],
    [false, true, false, null],
    [false, false, true, null],
    [false, false, false, null],
  ] as const)(
    "isBland=%s blandShaming=%s confirmshaming=%s → %s",
    (isBland, blandShaming, confirmshaming, insistLabel) => {
      const shame = shameFor({ isBland, blandShaming, confirmshaming }, ladder);
      if (insistLabel === null) expect(shame).toBeNull();
      else expect(shame).toEqual({ ladder, insistLabel });
    },
  );
});
