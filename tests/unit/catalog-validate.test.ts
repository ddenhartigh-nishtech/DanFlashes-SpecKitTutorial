import { describe, expect, it } from "vitest";
import type { StoreSettings, Tier } from "@/lib/catalog/types";
import {
  seedChecks,
  validateSettings,
  validateShirt,
  type ShirtDraft,
} from "@/lib/catalog/validate";
import { DEFAULT_MSRP_SETTINGS } from "@/lib/pricing/msrp";

const tiers: Tier[] = [
  {
    id: 1,
    name: "BLAND",
    tagline: null,
    minScore: 0,
    badgeBgColor: "#C8B89A",
    badgeTextColor: "#3B3B3B",
  },
  {
    id: 2,
    name: "Complicated",
    tagline: null,
    minScore: 10,
    badgeBgColor: "#FF2D95",
    badgeTextColor: "#FFFFFF",
  },
  {
    id: 3,
    name: "Very Complicated",
    tagline: null,
    minScore: 25,
    badgeBgColor: "#00E5FF",
    badgeTextColor: "#000000",
  },
];

const ctx = { tiers, msrp: DEFAULT_MSRP_SETTINGS, imageCount: 1 };

const valid: ShirtDraft = {
  slug: "geo-riot",
  name: "Geo Riot",
  style: "polo",
  complexity: 42,
  finalPriceUsd: null,
  description: "Forty-two reasons to stop talking to you.",
  status: "active",
  featured: false,
};

const fields = (issues: { field: string }[]) => issues.map((i) => i.field);

describe("validateShirt", () => {
  it("accepts a valid shirt", () => {
    expect(validateShirt(valid, ctx)).toEqual([]);
  });

  it.each([
    ["slug", { slug: "Geo Riot!" }],
    ["slug", { slug: "" }],
    ["name", { name: "" }],
    ["name", { name: "x".repeat(81) }],
    ["style", { style: "tank-top" }],
    ["complexity", { complexity: -1 }],
    ["complexity", { complexity: 4.5 }],
    ["finalPriceUsd", { finalPriceUsd: "0.00" }],
    ["finalPriceUsd", { finalPriceUsd: "19.999" }],
    ["description", { description: "" }],
    ["status", { status: "deleted" }],
  ])("flags an invalid %s", (field, patch) => {
    expect(fields(validateShirt({ ...valid, ...patch } as ShirtDraft, ctx))).toContain(field);
  });

  it("refuses a BLAND-tier shirt priced at or above the MSRP start price", () => {
    const bland = { ...valid, complexity: 3, finalPriceUsd: "300.00" };
    expect(fields(validateShirt(bland, ctx))).toContain("finalPriceUsd");
  });

  it("allows a BLAND-tier shirt under the start price, including at MSRP", () => {
    expect(validateShirt({ ...valid, complexity: 3, finalPriceUsd: "299.99" }, ctx)).toEqual([]);
    expect(validateShirt({ ...valid, complexity: 3 }, ctx)).toEqual([]);
  });

  it("refuses a BLAND tier whose MSRP crosses the start price (owner widened BLAND)", () => {
    const wideBland: Tier[] = [{ ...tiers[0] }, { ...tiers[1], minScore: 20 }];
    const issues = validateShirt({ ...valid, complexity: 15 }, { ...ctx, tiers: wideBland });
    expect(fields(issues)).toContain("finalPriceUsd");
  });

  it("requires at least one image for an active shirt, but not an inactive one", () => {
    expect(fields(validateShirt(valid, { ...ctx, imageCount: 0 }))).toContain("images");
    expect(validateShirt({ ...valid, status: "inactive" }, { ...ctx, imageCount: 0 })).toEqual([]);
  });
});

describe("validateSettings", () => {
  const settings: StoreSettings = {
    msrp: DEFAULT_MSRP_SETTINGS,
    checkoutGate: true,
    flashCreditPresetsUsd: ["500.00", "1000.00", "5000.00"],
    mediaBaseUrl: "",
    placeholderMediaId: 1,
    blandShaming: true,
    confirmshaming: true,
    perDiemDrain: true,
    drainJokes: true,
  };

  it("accepts the defaults and an https base URL", () => {
    expect(validateSettings(settings)).toEqual([]);
    expect(validateSettings({ ...settings, mediaBaseUrl: "https://cdn.example.com/df" })).toEqual(
      [],
    );
  });

  it.each([
    ["msrp.startPriceUsd", { msrp: { ...DEFAULT_MSRP_SETTINGS, startPriceUsd: "0.00" } }],
    ["msrp.startPriceUsd", { msrp: { ...DEFAULT_MSRP_SETTINGS, startPriceUsd: "300" } }],
    ["msrp.anchorScore", { msrp: { ...DEFAULT_MSRP_SETTINGS, anchorScore: -1 } }],
    ["msrp.doublingInterval", { msrp: { ...DEFAULT_MSRP_SETTINGS, doublingInterval: 0 } }],
    ["msrp.doublingInterval", { msrp: { ...DEFAULT_MSRP_SETTINGS, doublingInterval: 2.5 } }],
    ["flashCreditPresetsUsd", { flashCreditPresetsUsd: ["500"] }],
    ["flashCreditPresetsUsd", { flashCreditPresetsUsd: ["0.00"] }],
    ["mediaBaseUrl", { mediaBaseUrl: "ftp://files.example.com" }],
    ["mediaBaseUrl", { mediaBaseUrl: "C:/media" }],
    ["blandShaming", { blandShaming: "yes" }],
    ["blandShaming", { blandShaming: undefined }],
    ["confirmshaming", { confirmshaming: 1 }],
    ["confirmshaming", { confirmshaming: undefined }],
    ["perDiemDrain", { perDiemDrain: "on" }],
    ["perDiemDrain", { perDiemDrain: undefined }],
  ])("flags an invalid %s", (field, patch) => {
    expect(fields(validateSettings({ ...settings, ...patch } as StoreSettings))).toContain(field);
  });
});

describe("seedChecks (warnings only)", () => {
  const shirt = (slug: string, style: "polo" | "button-down", complexity: number) => ({
    slug,
    style,
    complexity,
    status: "active" as const,
  });

  const goodSeed = [
    shirt("beige-regret", "polo", 2),
    shirt("khaki-commitment", "button-down", 4),
    shirt("tc-tugger-belly-breather", "button-down", 34),
    ...Array.from({ length: 9 }, (_, i) =>
      shirt(`shirt-${i}`, i % 2 ? "polo" : "button-down", 12 + i),
    ),
  ];

  it("passes a catalog that meets FR-006", () => {
    expect(seedChecks(goodSeed, tiers)).toEqual([]);
  });

  it("warns about each gap", () => {
    const warnings = seedChecks([shirt("lonely-polo", "polo", 12)], tiers);
    const text = warnings.join("\n");
    expect(text).toMatch(/12/); // fewer than 12 active shirts
    expect(text).toMatch(/button-down/);
    expect(text).toMatch(/BLAND/);
    expect(text).toMatch(/Very Complicated/); // an empty tier
    expect(text).toMatch(/T\.C\. Tugger/);
  });

  it("ignores inactive shirts", () => {
    const withInactive = [
      ...goodSeed.slice(0, 11),
      { ...shirt("gone", "polo", 50), status: "inactive" as const },
    ];
    expect(seedChecks(withInactive, tiers).join("\n")).toMatch(/12/);
  });
});
