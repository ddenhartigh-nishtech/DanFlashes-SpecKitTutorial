import { describe, expect, it } from "vitest";
import { getSettings } from "@/lib/data/settings";
import { listPopCandidates } from "@/lib/data/shirts";
import { createSeededTestDb, setSwitches } from "../helpers/db";

describe("listPopCandidates", () => {
  it("names only active, non-bland shirts, by name and slug and nothing more", () => {
    const { db } = createSeededTestDb();
    const candidates = listPopCandidates(db, getSettings(db));
    const slugs = candidates.map((c) => c.slug);
    expect(slugs).toContain("geo-riot");
    expect(slugs).toContain("fractal-fury");
    expect(slugs).not.toContain("beige-regret"); // bland: nobody buys these
    expect(slugs).not.toContain("retired-riot"); // inactive
    for (const c of candidates) expect(Object.keys(c).sort()).toEqual(["name", "slug"]);
  });

  it("is empty with social proof off", () => {
    const { db } = createSeededTestDb();
    setSwitches(db, { socialProof: false });
    expect(listPopCandidates(db, getSettings(db))).toEqual([]);
  });
});
