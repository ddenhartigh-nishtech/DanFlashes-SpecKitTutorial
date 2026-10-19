import { describe, expect, it } from "vitest";
import { tierChanges, validateTierEdit, type TierDraft } from "@/lib/admin/tiers";
import type { Tier } from "@/lib/catalog/types";

const current: Tier[] = [
  {
    id: 1,
    name: "BLAND",
    tagline: "You sure?",
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
const same = (): TierDraft[] => current.map((t) => ({ ...t }));
const messages = (proposed: TierDraft[]) =>
  validateTierEdit(current, proposed).map((i) => i.message);

describe("validateTierEdit (008 FR-028, FR-029)", () => {
  it("accepts the tiers as they are, and BLAND with a new tagline and colors", () => {
    expect(validateTierEdit(current, same())).toEqual([]);
    const restyled = same();
    restyled[0] = { ...restyled[0], tagline: "Beige is a choice.", badgeBgColor: "#AAAAAA" };
    expect(validateTierEdit(current, restyled)).toEqual([]);
  });

  it("accepts a new tier and a removed one, as long as BLAND stays", () => {
    const edited = same().filter((t) => t.id !== 3);
    edited.push({
      name: "Off the Charts",
      tagline: null,
      minScore: 90,
      badgeBgColor: "#7A00FF",
      badgeTextColor: "#FFE600",
    });
    expect(validateTierEdit(current, edited)).toEqual([]);
  });

  it("won't let BLAND be renamed, moved or removed", () => {
    const renamed = same();
    renamed[0].name = "Understated";
    expect(messages(renamed).join(" ")).toMatch(/BLAND/);
    const moved = same();
    moved[0].minScore = 1;
    expect(messages(moved).join(" ")).toMatch(/BLAND/);
    expect(messages(same().slice(1)).join(" ")).toMatch(/BLAND/);
  });

  it.each([
    ["an empty name", (t: TierDraft[]) => (t[1].name = "  ")],
    ["a 41-character name", (t: TierDraft[]) => (t[1].name = "x".repeat(41))],
    ["a 121-character tagline", (t: TierDraft[]) => (t[1].tagline = "x".repeat(121))],
    ["a color that isn't #RRGGBB", (t: TierDraft[]) => (t[1].badgeBgColor = "pink")],
    ["two tiers at one score", (t: TierDraft[]) => (t[2].minScore = 10)],
    ["two tiers with one name", (t: TierDraft[]) => (t[2].name = "complicated")],
    ["a fractional start", (t: TierDraft[]) => (t[2].minScore = 25.5)],
    ["a tier that doesn't exist", (t: TierDraft[]) => (t[2].id = 99)],
  ])("refuses %s", (_name, change) => {
    const edited = same();
    change(edited);
    expect(validateTierEdit(current, edited).length).toBeGreaterThan(0);
  });
});

describe("tierChanges (008 FR-028)", () => {
  const shirts = [
    { id: 1, name: "Beige Regret", complexity: 3 },
    { id: 2, name: "Geo Riot", complexity: 15 },
    { id: 3, name: "Fractal Fury", complexity: 30 },
  ];

  it("lists exactly the shirts whose tier would change, from and to", () => {
    const edited = same();
    edited[1].minScore = 20; // Geo Riot (15) falls into BLAND
    expect(tierChanges(shirts, current, edited)).toEqual([
      { shirt: shirts[1], from: "Complicated", to: "BLAND" },
    ]);
  });

  it("follows a rename, and says nothing when nothing moves", () => {
    const renamed = same();
    renamed[2].name = "Seriously";
    expect(tierChanges(shirts, current, renamed)).toEqual([
      { shirt: shirts[2], from: "Very Complicated", to: "Seriously" },
    ]);
    expect(tierChanges(shirts, current, same())).toEqual([]);
  });

  it("says nothing for a set that has no BLAND tier to sort by", () => {
    expect(tierChanges(shirts, current, same().slice(1))).toEqual([]);
  });
});
