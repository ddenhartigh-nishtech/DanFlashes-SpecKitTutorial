import { beforeAll, describe, expect, it } from "vitest";
import { getPlaceholderUrl, getSettings, saveSettings } from "@/lib/data/settings";
import { getShirtBySlug, listCatalogShirts, toShopperShirt } from "@/lib/data/shirts";
import { listTiers } from "@/lib/data/tiers";
import { seedCatalog, type CatalogFixture } from "@/lib/data/seed";
import { SMALL_FIXTURE } from "../fixtures/catalog";
import { createTestDb } from "../helpers/db";

describe("catalog data layer", () => {
  const { db, sqlite } = createTestDb();

  it("getSettings explains how to fix an unseeded database", () => {
    expect(() => getSettings(db)).toThrow(/db:seed|db:reset/);
  });

  describe("after seeding", () => {
    beforeAll(() => {
      seedCatalog(db, SMALL_FIXTURE);
    });

    it("getSettings returns typed settings", () => {
      const s = getSettings(db);
      expect(s.msrp).toEqual({ startPriceUsd: "300.00", anchorScore: 10, doublingInterval: 10 });
      expect(s.checkoutGate).toBe(true);
      expect(s.flashCreditPresetsUsd).toEqual(["500.00", "1000.00", "5000.00"]);
      expect(s.mediaBaseUrl).toBe("");
      expect(s.placeholderMediaId).toEqual(expect.any(Number));
    });

    it("resolves the configured placeholder image URL", () => {
      expect(getPlaceholderUrl(db, getSettings(db))).toBe("/media/placeholder.svg");
    });

    it("listTiers returns tiers ordered by min score", () => {
      expect(listTiers(db).map((t) => t.name)).toEqual([
        "BLAND",
        "Complicated",
        "Very Complicated",
      ]);
    });

    it("lists active shirts with resolved prices, tiers, and image URLs", () => {
      const shirts = listCatalogShirts(db);
      expect(shirts.map((s) => s.slug).sort()).toEqual([
        "beige-regret",
        "fractal-fury",
        "geo-riot",
      ]);
      const bySlug = Object.fromEntries(shirts.map((s) => [s.slug, s]));
      expect(bySlug["beige-regret"].finalPriceUsd).toBe("184.67");
      expect(bySlug["beige-regret"].tier).toMatchObject({ name: "BLAND", isBland: true });
      expect(bySlug["geo-riot"].finalPriceUsd).toBe("424.26");
      expect(bySlug["geo-riot"].tier.name).toBe("Complicated");
      expect(bySlug["fractal-fury"]).toMatchObject({
        finalPriceUsd: "999.99",
        msrpUsd: "1200.00",
        featured: true,
      });
      expect(bySlug["fractal-fury"].images).toEqual([
        { url: "/media/shirts/fractal-fury.svg", alt: "Fractals." },
      ]);
    });

    it("can include inactive shirts", () => {
      expect(listCatalogShirts(db, { includeInactive: true })).toHaveLength(4);
    });

    it("the shopper-facing shape never carries the complexity score or MSRP", () => {
      const shopper = toShopperShirt(listCatalogShirts(db)[0]);
      expect(shopper).not.toHaveProperty("complexity");
      expect(shopper).not.toHaveProperty("msrpUsd");
      expect(JSON.stringify(shopper)).not.toMatch(/complexity/i);
    });

    it("getShirtBySlug returns inactive shirts with their status, and null when unknown", () => {
      expect(getShirtBySlug(db, "retired-riot")?.status).toBe("inactive");
      expect(getShirtBySlug(db, "no-such-shirt")).toBeNull();
    });

    it("a new media base URL moves every image without editing shirts", () => {
      saveSettings(db, { ...getSettings(db), mediaBaseUrl: "https://cdn.example.com/df" });
      expect(listCatalogShirts(db)[0].images[0].url).toMatch(
        /^https:\/\/cdn\.example\.com\/df\/shirts\//,
      );
      saveSettings(db, { ...getSettings(db), mediaBaseUrl: "" });
    });

    it("refuses to save invalid settings", () => {
      expect(() => saveSettings(db, { ...getSettings(db), mediaBaseUrl: "ftp://nope" })).toThrow(
        /mediaBaseUrl/,
      );
    });

    it("refuses to delete a shirt that appears in an order (FR-009)", () => {
      const shirt = getShirtBySlug(db, "geo-riot")!;
      const user = sqlite
        .prepare("INSERT INTO users (email, password_hash) VALUES ('a@b.c', 'x') RETURNING id")
        .get() as { id: number };
      const order = sqlite
        .prepare(
          `INSERT INTO orders (user_id, checkout_token, subtotal_usd, total_usd, payment_method, card_brand, card_last4)
           VALUES (?, 'tok-1', '424.26', '424.26', 'card', 'Visa', '4242') RETURNING id`,
        )
        .get(user.id) as { id: number };
      sqlite
        .prepare(
          `INSERT INTO order_items (order_id, shirt_id, shirt_name, tier_name, complexity, size, quantity, final_price_usd, msrp_usd)
           VALUES (?, ?, 'Geo Riot', 'Complicated', 15, 'L', 1, '424.26', '424.26')`,
        )
        .run(order.id, shirt.id);
      expect(() => sqlite.prepare("DELETE FROM shirts WHERE id = ?").run(shirt.id)).toThrow(
        /FOREIGN KEY/,
      );
    });
  });
});

describe("seedCatalog", () => {
  const { db } = createTestDb();

  it("is idempotent: a second run inserts nothing", () => {
    const first = seedCatalog(db, SMALL_FIXTURE);
    const second = seedCatalog(db, SMALL_FIXTURE);
    expect(first).toEqual({ tiers: 3, media: 5, shirts: 4 });
    expect(second).toEqual({ tiers: 0, media: 0, shirts: 0 });
  });

  it("refuses a BLAND shirt priced at the start price, naming the shirt", () => {
    const { db: fresh } = createTestDb();
    const bad: CatalogFixture = {
      ...SMALL_FIXTURE,
      shirts: [{ ...SMALL_FIXTURE.shirts[0], finalPriceUsd: "300.00" }],
    };
    expect(() => seedCatalog(fresh, bad)).toThrow(/beige-regret/);
  });

  it("refuses invalid tiers", () => {
    const { db: fresh } = createTestDb();
    const bad: CatalogFixture = { ...SMALL_FIXTURE, tiers: SMALL_FIXTURE.tiers.slice(1) };
    expect(() => seedCatalog(fresh, bad)).toThrow(/min score 0/);
  });
});
