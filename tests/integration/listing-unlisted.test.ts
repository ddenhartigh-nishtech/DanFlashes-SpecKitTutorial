/**
 * One of a kind (007 FR-018, SC-008): a shopper-made shirt never shows in the listing, the home
 * page, the pop-ups or the shaming loop's picks, until the owner lists it. Its own page, carts and
 * orders don't care.
 */
import { describe, expect, it } from "vitest";
import {
  getCatalogShirtsByIds,
  getShirtBySlug,
  listCatalogShirts,
  listPopCandidates,
} from "@/lib/data/shirts";
import { getSettings } from "@/lib/data/settings";
import { buildLadder } from "@/lib/shaming/ladder";
import { createSeededTestDb } from "../helpers/db";

function setup() {
  const test = createSeededTestDb();
  const { id } = test.sqlite
    .prepare(
      `INSERT INTO shirts (slug, name, style, complexity, description, origin, recipe, listed)
       VALUES ('one-of-a-kind-abcde', 'Load-Bearing Paisley', 'polo', 60, 'Made on the dial.', 'dial', 'v1:polo:60:7', 0)
       RETURNING id`,
    )
    .get() as { id: number };
  test.sqlite
    .prepare("INSERT INTO shirt_images (shirt_id, media_id, position) VALUES (?, 1, 0)")
    .run(id);
  return { ...test, id };
}

const slugs = (shirts: readonly { slug: string }[]) => shirts.map((s) => s.slug);

describe("an unlisted shirt (007 FR-018)", () => {
  it("is missing from the listing, the shaming loop's picks and the pop-ups", () => {
    const { db } = setup();
    expect(slugs(listCatalogShirts(db))).not.toContain("one-of-a-kind-abcde");
    expect(slugs(buildLadder(listCatalogShirts(db)))).not.toContain("one-of-a-kind-abcde");
    expect(slugs(listPopCandidates(db, getSettings(db)))).not.toContain("one-of-a-kind-abcde");
  });

  it("is still a real shirt: its page, its cart lines and its orders find it", () => {
    const { db, id } = setup();
    expect(getShirtBySlug(db, "one-of-a-kind-abcde")?.name).toBe("Load-Bearing Paisley");
    expect(getCatalogShirtsByIds(db, [id]).get(id)?.slug).toBe("one-of-a-kind-abcde");
    expect(slugs(listCatalogShirts(db, { includeUnlisted: true }))).toContain(
      "one-of-a-kind-abcde",
    );
  });

  it("joins the listing once the owner lists it", () => {
    const { db, sqlite, id } = setup();
    sqlite.prepare("UPDATE shirts SET listed = 1 WHERE id = ?").run(id);
    expect(slugs(listCatalogShirts(db))).toContain("one-of-a-kind-abcde");
  });
});
