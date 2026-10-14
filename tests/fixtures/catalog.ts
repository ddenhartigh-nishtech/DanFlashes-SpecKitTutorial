import type { CatalogFixture } from "@/lib/data/seed";

/** A tiny catalog for integration tests: BLAND, Complicated, and Very Complicated tiers. */
export const SMALL_FIXTURE: CatalogFixture = {
  settings: {
    msrp: { startPriceUsd: "300.00", anchorScore: 10, doublingInterval: 10 },
    checkoutGate: true,
    blandShaming: true,
    confirmshaming: true,
    perDiemDrain: true,
    flashCreditPresetsUsd: ["500.00", "1000.00", "5000.00"],
    mediaBaseUrl: "",
  },
  placeholder: { key: "placeholder.svg", alt: "Image too complicated to load" },
  tiers: [
    {
      name: "BLAND",
      tagline: "You sure about that?",
      minScore: 0,
      badgeBgColor: "#C8B89A",
      badgeTextColor: "#3B3B3B",
    },
    {
      name: "Complicated",
      tagline: null,
      minScore: 10,
      badgeBgColor: "#FF2D95",
      badgeTextColor: "#FFFFFF",
    },
    {
      name: "Very Complicated",
      tagline: null,
      minScore: 25,
      badgeBgColor: "#00E5FF",
      badgeTextColor: "#000000",
    },
  ],
  shirts: [
    {
      slug: "beige-regret",
      name: "Beige Regret",
      style: "polo",
      complexity: 3,
      description: "Why.",
      image: { key: "shirts/beige-regret.svg", alt: "Beige." },
    },
    {
      slug: "geo-riot",
      name: "Geo Riot",
      style: "button-down",
      complexity: 15,
      description: "Loud.",
      image: { key: "shirts/geo-riot.svg", alt: "Triangles." },
    },
    {
      slug: "fractal-fury",
      name: "Fractal Fury",
      style: "polo",
      complexity: 30,
      finalPriceUsd: "999.99",
      description: "Louder.",
      featured: true,
      image: { key: "shirts/fractal-fury.svg", alt: "Fractals." },
    },
    {
      slug: "retired-riot",
      name: "Retired Riot",
      style: "polo",
      complexity: 20,
      status: "inactive",
      description: "Gone.",
      image: { key: "shirts/retired-riot.svg", alt: "Old." },
    },
  ],
};
