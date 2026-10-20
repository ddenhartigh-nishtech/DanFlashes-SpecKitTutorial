import { describe, expect, it } from "vitest";
import {
  attachImageCore,
  createShirtCore,
  detachImageCore,
  moveImageCore,
  setShirtStatusCore,
  updateShirtCore,
} from "@/lib/actions/admin/shirts";
import { checkCatalog } from "@/lib/admin/catalog-check";
import { listTiers } from "@/lib/data/tiers";
import { getCatalogShirtsByIds, listCatalogShirts } from "@/lib/data/shirts";
import { getAdminShirt, listAdminShirts } from "@/lib/data/admin-shirts";
import type { Sqlite } from "@/lib/db/client";
import { form } from "../helpers/cookies";
import { createSeededTestDb } from "../helpers/db";
import { person } from "../helpers/people";

function setup() {
  const test = createSeededTestDb();
  const owner = person(test.db, { admin: true });
  return { ...test, jar: owner.jar };
}

const draft = (fields: Record<string, string> = {}) =>
  form({
    name: "Test Pattern",
    slug: "test-pattern",
    style: "polo",
    complexity: "30",
    description: "Lots going on.",
    finalPriceUsd: "",
    mainMediaId: "",
    ...fields,
  });

const shirt = (sqlite: Sqlite, slug: string) =>
  sqlite.prepare("SELECT * FROM shirts WHERE slug = ?").get(slug) as
    | { id: number; slug: string; name: string; status: string; final_price_usd: string | null }
    | undefined;
const count = (sqlite: Sqlite) =>
  (sqlite.prepare("SELECT COUNT(*) AS n FROM shirts").get() as { n: number }).n;
const images = (sqlite: Sqlite, shirtId: number) =>
  sqlite
    .prepare(
      "SELECT media_id AS mediaId, position FROM shirt_images WHERE shirt_id = ? ORDER BY position",
    )
    .all(shirtId) as { mediaId: number; position: number }[];
const mediaId = (sqlite: Sqlite, key: string) =>
  (sqlite.prepare("SELECT id FROM media WHERE key = ?").get(key) as { id: number }).id;

describe("createShirt (008 FR-007, FR-009)", () => {
  it("saves a shirt with no image inactive, at the MSRP, with Dan's encouragement", () => {
    const { db, sqlite, jar } = setup();
    const state = createShirtCore(db, jar, draft());
    expect(state).toMatchObject({ ok: true, message: "Saved. That was a good decision, Dan." });
    expect(shirt(sqlite, "test-pattern")).toMatchObject({
      status: "inactive",
      final_price_usd: null,
    });
  });

  it("puts a shirt with a main image and 'live' straight on the floor, image first", () => {
    const { db, sqlite, jar } = setup();
    const media = mediaId(sqlite, "shirts/geo-riot.svg");
    const state = createShirtCore(
      db,
      jar,
      draft({ mainMediaId: String(media), active: "on", featured: "on" }),
    );
    expect(state.ok).toBe(true);
    const row = shirt(sqlite, "test-pattern")!;
    expect(row.status).toBe("active");
    expect(images(sqlite, row.id)).toEqual([{ mediaId: media, position: 0 }]);
  });

  it("keeps a whole-dollar price as dollars and cents (FR-038)", () => {
    const { db, sqlite, jar } = setup();
    createShirtCore(db, jar, draft({ finalPriceUsd: "1400" }));
    expect(shirt(sqlite, "test-pattern")?.final_price_usd).toBe("1400.00");
  });

  it.each([
    [{ slug: "Bad Slug" }, "slug"],
    [{ slug: "geo-riot" }, "slug"],
    [{ name: "x".repeat(81) }, "name"],
    [{ complexity: "-1" }, "complexity"],
    [{ complexity: "2.5" }, "complexity"],
    [{ complexity: "" }, "complexity"],
    [{ finalPriceUsd: "0.001" }, "finalPriceUsd"],
    [{ finalPriceUsd: "abc" }, "finalPriceUsd"],
    [{ description: "  " }, "description"],
    [{ style: "tank-top" }, "style"],
    [{ active: "on" }, "images"],
    [{ mainMediaId: "9999" }, "mainMediaId"],
  ])("refuses %j (%s) and writes nothing", (fields, field) => {
    const { db, sqlite, jar } = setup();
    const before = count(sqlite);
    const state = createShirtCore(db, jar, draft(fields));
    expect(state.ok).toBe(false);
    expect(!state.ok && state.issues?.map((i) => i.field)).toContain(field);
    expect(count(sqlite)).toBe(before);
  });

  it("refuses a BLAND shirt at or above the start price, saying the limit and the price", () => {
    const { db, jar } = setup();
    const state = createShirtCore(db, jar, draft({ complexity: "5", finalPriceUsd: "400" }));
    expect(state.ok).toBe(false);
    const message = !state.ok ? state.issues?.[0]?.message : "";
    expect(message).toContain("$300.00");
    expect(message).toContain("$400.00");
  });
});

describe("updateShirt (008 FR-009)", () => {
  it("edits everything but the URL name, which a form can't change", () => {
    const { db, sqlite, jar } = setup();
    const id = shirt(sqlite, "geo-riot")!.id;
    const state = updateShirtCore(
      db,
      jar,
      draft({ id: String(id), slug: "sneaky-new-slug", name: "Geo Riot II", complexity: "16" }),
    );
    expect(state.ok).toBe(true);
    expect(shirt(sqlite, "sneaky-new-slug")).toBeUndefined();
    expect(shirt(sqlite, "geo-riot")).toMatchObject({ name: "Geo Riot II" });
  });

  it("clears Dan's price back to the MSRP, and refuses a bland price at the start price", () => {
    const { db, sqlite, jar } = setup();
    const fury = shirt(sqlite, "fractal-fury")!.id;
    expect(updateShirtCore(db, jar, draft({ id: String(fury), finalPriceUsd: "" })).ok).toBe(true);
    expect(shirt(sqlite, "fractal-fury")?.final_price_usd).toBeNull();

    const beige = shirt(sqlite, "beige-regret")!.id;
    const refused = updateShirtCore(
      db,
      jar,
      draft({ id: String(beige), complexity: "3", finalPriceUsd: "300.00" }),
    );
    expect(refused.ok).toBe(false);
    expect(shirt(sqlite, "beige-regret")?.final_price_usd).toBeNull();
  });

  it("refuses an unknown shirt", () => {
    const { db, jar } = setup();
    expect(updateShirtCore(db, jar, draft({ id: "9999" })).ok).toBe(false);
  });
});

describe("setShirtStatus (008 FR-010)", () => {
  it("won't put a shirt with no image on the floor", () => {
    const { db, sqlite, jar } = setup();
    createShirtCore(db, jar, draft());
    const id = shirt(sqlite, "test-pattern")!.id;
    const state = setShirtStatusCore(db, jar, form({ id: String(id), status: "active" }));
    expect(state.ok).toBe(false);
    expect(shirt(sqlite, "test-pattern")?.status).toBe("inactive");
  });

  it("deactivates (gone from the floor, still there for orders) and reactivates", () => {
    const { db, sqlite, jar } = setup();
    const id = shirt(sqlite, "geo-riot")!.id;
    expect(setShirtStatusCore(db, jar, form({ id: String(id), status: "inactive" })).ok).toBe(true);
    expect(listCatalogShirts(db).map((s) => s.slug)).not.toContain("geo-riot");
    expect(getCatalogShirtsByIds(db, [id]).get(id)?.status).toBe("inactive");
    expect(setShirtStatusCore(db, jar, form({ id: String(id), status: "active" })).ok).toBe(true);
    expect(listCatalogShirts(db).map((s) => s.slug)).toContain("geo-riot");
  });

  it("refuses a status that isn't one", () => {
    const { db, sqlite, jar } = setup();
    const id = shirt(sqlite, "geo-riot")!.id;
    expect(setShirtStatusCore(db, jar, form({ id: String(id), status: "deleted" })).ok).toBe(false);
  });
});

describe("a shirt's images (008 FR-024)", () => {
  it("attaches in order, refuses a repeat, moves one up, and keeps an active shirt's last one", () => {
    const { db, sqlite, jar } = setup();
    const id = shirt(sqlite, "geo-riot")!.id;
    const geo = mediaId(sqlite, "shirts/geo-riot.svg");
    const fury = mediaId(sqlite, "shirts/fractal-fury.svg");

    expect(attachImageCore(db, jar, form({ shirtId: String(id), mediaId: String(fury) })).ok).toBe(
      true,
    );
    expect(images(sqlite, id)).toEqual([
      { mediaId: geo, position: 0 },
      { mediaId: fury, position: 1 },
    ]);
    expect(attachImageCore(db, jar, form({ shirtId: String(id), mediaId: String(fury) })).ok).toBe(
      false,
    );

    const up = form({ shirtId: String(id), mediaId: String(fury), direction: "up" });
    expect(moveImageCore(db, jar, up).ok).toBe(true);
    expect(images(sqlite, id).map((i) => i.mediaId)).toEqual([fury, geo]);
    // Already first: nothing to move, and nothing breaks.
    expect(moveImageCore(db, jar, up).ok).toBe(true);
    expect(images(sqlite, id).map((i) => i.mediaId)).toEqual([fury, geo]);

    const detachFury = form({ shirtId: String(id), mediaId: String(fury) });
    expect(detachImageCore(db, jar, detachFury).ok).toBe(true);
    expect(images(sqlite, id)).toEqual([{ mediaId: geo, position: 0 }]);

    const last = detachImageCore(db, jar, form({ shirtId: String(id), mediaId: String(geo) }));
    expect(last.ok).toBe(false);
    expect(images(sqlite, id)).toHaveLength(1);
  });

  it("lets an inactive shirt go without pictures", () => {
    const { db, sqlite, jar } = setup();
    const id = shirt(sqlite, "retired-riot")!.id;
    const media = images(sqlite, id)[0].mediaId;
    expect(detachImageCore(db, jar, form({ shirtId: String(id), mediaId: String(media) })).ok).toBe(
      true,
    );
    expect(images(sqlite, id)).toEqual([]);
  });

  it("refuses an unknown shirt or image", () => {
    const { db, sqlite, jar } = setup();
    const id = shirt(sqlite, "geo-riot")!.id;
    expect(attachImageCore(db, jar, form({ shirtId: "9999", mediaId: "1" })).ok).toBe(false);
    expect(attachImageCore(db, jar, form({ shirtId: String(id), mediaId: "9999" })).ok).toBe(false);
    expect(detachImageCore(db, jar, form({ shirtId: String(id), mediaId: "9999" })).ok).toBe(false);
  });
});

describe("checkCatalog (008 R10)", () => {
  it("names each shirt a proposed tier set or tuning would break", () => {
    const { db, sqlite, jar } = setup();
    const tiers = listTiers(db).map((t) => (t.name === "Complicated" ? { ...t, minScore: 20 } : t));
    // At its MSRP, Geo Riot (15) slides into BLAND at $425.00, under the new $550.00 start (010 R4).
    expect(checkCatalog(db, { tiers })).toEqual([]);
    // At Dan's $600.00, it would sit over that line.
    sqlite.prepare("UPDATE shirts SET final_price_usd = '600.00' WHERE slug = 'geo-riot'").run();
    expect(checkCatalog(db, { tiers }).map((i) => i.field)).toEqual(["geo-riot"]);
    // Dials that bring a real shirt's start down to Dan's BLAND price break it too.
    sqlite
      .prepare("UPDATE shirts SET final_price_usd = '250.00' WHERE slug = 'beige-regret'")
      .run();
    const cheap = { basePriceUsd: "10.00", perPointUsd: "20.00" };
    expect(checkCatalog(db, { msrp: cheap }).map((i) => i.field)).toContain("beige-regret");
    // No score is too complicated to price under any dials (010 FR-002).
    createShirtCore(db, jar, draft({ complexity: "2000000" }));
    const tiny = { basePriceUsd: "0.01", perPointUsd: "0.01" };
    expect(checkCatalog(db, { msrp: tiny }).map((i) => i.field)).not.toContain("test-pattern");
  });
});

describe("listAdminShirts (008 FR-006)", () => {
  it("lists every shirt with its score, tier, MSRP and final price, by score", () => {
    const { db } = setup();
    const rows = listAdminShirts(db, {});
    expect(rows.map((r) => r.slug)).toEqual([
      "beige-regret",
      "geo-riot",
      "retired-riot",
      "fractal-fury",
    ]);
    expect(rows.find((r) => r.slug === "geo-riot")).toMatchObject({
      complexity: 15,
      msrpUsd: "425.00",
      finalPriceUsd: "425.00",
      priceIsDans: false,
      status: "active",
      tier: { name: "Complicated" },
    });
    expect(rows.find((r) => r.slug === "fractal-fury")).toMatchObject({
      finalPriceUsd: "999.99",
      priceIsDans: true,
    });
  });

  it("filters by status and tier, and sorts by price or name", () => {
    const { db } = setup();
    const slugs = (o: Parameters<typeof listAdminShirts>[1]) =>
      listAdminShirts(db, o).map((r) => r.slug);
    expect(slugs({ status: "inactive" })).toEqual(["retired-riot"]);
    expect(slugs({ status: "active" })).not.toContain("retired-riot");
    const complicated = listTiers(db).find((t) => t.name === "Complicated")!.id;
    expect(slugs({ tierId: complicated })).toEqual(["geo-riot", "retired-riot"]);
    expect(slugs({ sort: "name" })).toEqual([
      "beige-regret",
      "fractal-fury",
      "geo-riot",
      "retired-riot",
    ]);
    const byPrice = listAdminShirts(db, { sort: "price" }).map((r) => r.finalPriceUsd);
    expect(byPrice).toEqual([...byPrice].sort((a, b) => Number(a) - Number(b)));
  });

  it("finds one shirt with its images in order, and nothing for an unknown id", () => {
    const { db, sqlite } = setup();
    const id = shirt(sqlite, "geo-riot")!.id;
    expect(getAdminShirt(db, id)).toMatchObject({
      slug: "geo-riot",
      images: [{ position: 0, alt: "Triangles." }],
    });
    expect(getAdminShirt(db, 9999)).toBeNull();
  });
});
