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

  it("refuses a BLAND-tier shirt priced at or above a real shirt's start (010 FR-006)", () => {
    const bland = { ...valid, complexity: 3, finalPriceUsd: "300.00" };
    expect(validateShirt(bland, ctx)).toEqual([
      {
        field: "finalPriceUsd",
        message: "BLAND shirts must cost less than $300.00; this one resolves to $300.00.",
      },
    ]);
  });

  it("allows a BLAND-tier shirt under a real shirt's start, including at MSRP", () => {
    expect(validateShirt({ ...valid, complexity: 3, finalPriceUsd: "299.99" }, ctx)).toEqual([]);
    expect(validateShirt({ ...valid, complexity: 9 }, ctx)).toEqual([]);
  });

  it("moves a real shirt's start with the first tier above BLAND (owner widened BLAND)", () => {
    const wideBland: Tier[] = [{ ...tiers[0] }, { ...tiers[1], minScore: 20 }];
    const wide = { ...ctx, tiers: wideBland };
    expect(validateShirt({ ...valid, complexity: 15, finalPriceUsd: "500.00" }, wide)).toEqual([]);
    expect(validateShirt({ ...valid, complexity: 19 }, wide)).toEqual([]);
    expect(
      fields(validateShirt({ ...valid, complexity: 15, finalPriceUsd: "550.00" }, wide)),
    ).toContain("finalPriceUsd");
  });

  it("has nothing to undercut when BLAND is the only tier", () => {
    const onlyBland = { ...ctx, tiers: [tiers[0]] };
    expect(validateShirt({ ...valid, complexity: 3, finalPriceUsd: "9999.00" }, onlyBland)).toEqual(
      [],
    );
  });

  it("requires at least one image for an active shirt, but not an inactive one", () => {
    expect(fields(validateShirt(valid, { ...ctx, imageCount: 0 }))).toContain("images");
    expect(validateShirt({ ...valid, status: "inactive" }, { ...ctx, imageCount: 0 })).toEqual([]);
  });

  it("prices every whole score: nothing is too complicated to price (010 FR-002)", () => {
    expect(validateShirt({ ...valid, complexity: 1_000_000 }, ctx)).toEqual([]);
    expect(validateShirt({ ...valid, complexity: 999_999_999 }, ctx)).toEqual([]);
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
    fakeScarcity: true,
    countdownTimers: true,
    socialProof: true,
    preCheckedAddOns: true,
    roachMotel: true,
    flashMode: true,
    pipesBackground: true,
    nosySignUp: true,
    patternGenerator: true,
    uniquitySurcharge: true,
    uniquitySurchargeUsd: "499.99",
    pushySalesBot: true,
    pssbModelUrl: null,
    pssbModel: null,
    supportEmail: null,
  };

  it("accepts the defaults and an https base URL", () => {
    expect(validateSettings(settings)).toEqual([]);
    expect(validateSettings({ ...settings, mediaBaseUrl: "https://cdn.example.com/df" })).toEqual(
      [],
    );
  });

  it.each([
    ["msrp.basePriceUsd", { msrp: { ...DEFAULT_MSRP_SETTINGS, basePriceUsd: "0.00" } }],
    ["msrp.basePriceUsd", { msrp: { ...DEFAULT_MSRP_SETTINGS, basePriceUsd: "-1.00" } }],
    ["msrp.basePriceUsd", { msrp: { ...DEFAULT_MSRP_SETTINGS, basePriceUsd: "50" } }],
    ["msrp.basePriceUsd", { msrp: { perPointUsd: "25.00" } }],
    ["msrp.perPointUsd", { msrp: { ...DEFAULT_MSRP_SETTINGS, perPointUsd: "0.00" } }],
    ["msrp.perPointUsd", { msrp: { ...DEFAULT_MSRP_SETTINGS, perPointUsd: "-25.00" } }],
    ["msrp.perPointUsd", { msrp: { ...DEFAULT_MSRP_SETTINGS, perPointUsd: "lots" } }],
    ["msrp.perPointUsd", { msrp: { basePriceUsd: "50.00" } }],
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
    ["fakeScarcity", { fakeScarcity: "on" }],
    ["fakeScarcity", { fakeScarcity: undefined }],
    ["countdownTimers", { countdownTimers: 1 }],
    ["countdownTimers", { countdownTimers: undefined }],
    ["socialProof", { socialProof: "yes" }],
    ["socialProof", { socialProof: undefined }],
    ["preCheckedAddOns", { preCheckedAddOns: "on" }],
    ["preCheckedAddOns", { preCheckedAddOns: undefined }],
    ["roachMotel", { roachMotel: 1 }],
    ["roachMotel", { roachMotel: undefined }],
    ["flashMode", { flashMode: "on" }],
    ["flashMode", { flashMode: undefined }],
    ["pipesBackground", { pipesBackground: 1 }],
    ["pipesBackground", { pipesBackground: undefined }],
    ["nosySignUp", { nosySignUp: "on" }],
    ["nosySignUp", { nosySignUp: undefined }],
    ["patternGenerator", { patternGenerator: "on" }],
    ["patternGenerator", { patternGenerator: undefined }],
    ["uniquitySurcharge", { uniquitySurcharge: "on" }],
    ["uniquitySurchargeUsd", { uniquitySurchargeUsd: "lots" }],
    ["uniquitySurchargeUsd", { uniquitySurchargeUsd: "-1.00" }],
    ["pushySalesBot", { pushySalesBot: "on" }],
    ["pssbModelUrl", { pssbModelUrl: "ftp://ollama" }],
    ["pssbModelUrl", { pssbModelUrl: `http://${"x".repeat(200)}` }],
    ["pssbModel", { pssbModel: "" }],
    ["pssbModel", { pssbModel: "bad name!" }],
    ["supportEmail", { supportEmail: "dan" }],
    ["supportEmail", { supportEmail: `${"d".repeat(120)}@x.io` }],
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
