import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore } from "../helpers/migrations";

/** An old database: two shirts, one with an image, one in a cart and on an order. */
function oldDatabase() {
  const { sqlite, db } = databaseBefore("0012");
  sqlite.exec(`
    INSERT INTO store_settings (id, nosy_sign_up) VALUES (1, 0);
    INSERT INTO media (id, key, alt, kind) VALUES (1, 'shirts/a.svg', 'A.', 'shirt');
    INSERT INTO shirts (id, slug, name, style, complexity, description) VALUES
      (1, 'geo-riot', 'Geo Riot', 'polo', 15, 'Loud.'),
      (2, 'beige-regret', 'Beige Regret', 'polo', 3, 'Why.');
    INSERT INTO shirt_images (shirt_id, media_id, position) VALUES (1, 1, 0);
    INSERT INTO users (id, email, password_hash) VALUES (1, 'old@x.io', 'h');
    INSERT INTO carts (id, user_id) VALUES ('cart-1', 1);
    INSERT INTO cart_items (cart_id, shirt_id, size, quantity) VALUES ('cart-1', 1, 'M', 1);
    INSERT INTO orders (id, user_id, checkout_token, subtotal_usd, total_usd, payment_method, card_brand, card_last4)
      VALUES (1, 1, 'tok-1', '424.26', '424.26', 'card', 'Visa', '4242');
    INSERT INTO order_items (order_id, shirt_id, shirt_name, tier_name, complexity, size, quantity, final_price_usd, msrp_usd)
      VALUES (1, 1, 'Geo Riot', 'Complicated', 15, 'M', 1, '424.26', '424.26');
  `);
  return { sqlite, db };
}

const insertShirt = (sqlite: import("better-sqlite3").Database, values: string) =>
  sqlite.exec(
    `INSERT INTO shirts (slug, name, style, complexity, description, origin, recipe, listed) VALUES ${values}`,
  );

describe("migration 0012 (generated shirts and the pattern generator switch)", () => {
  it("makes every existing shirt a listed catalog shirt, leaving the rest alone", () => {
    const { sqlite, db } = oldDatabase();
    const before = sqlite.prepare("SELECT * FROM shirts ORDER BY id").all() as object[];
    runMigrations(db);
    expect(sqlite.prepare("SELECT * FROM shirts ORDER BY id").all()).toEqual(
      before.map((row) => ({
        ...row,
        origin: "catalog",
        recipe: null,
        listed: 1,
        maker_user_id: null,
      })),
    );
    expect(sqlite.prepare("SELECT * FROM store_settings").get()).toMatchObject({
      nosy_sign_up: 0,
      pattern_generator: 1,
    });
  });

  it("keeps every image, cart line and order line pointing at its shirt", () => {
    const { sqlite, db } = oldDatabase();
    runMigrations(db);
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
    expect(
      sqlite
        .prepare(
          `SELECT s.slug FROM shirt_images i JOIN shirts s ON s.id = i.shirt_id
           UNION ALL SELECT s.slug FROM cart_items c JOIN shirts s ON s.id = c.shirt_id
           UNION ALL SELECT s.slug FROM order_items o JOIN shirts s ON s.id = o.shirt_id`,
        )
        .all(),
    ).toEqual([{ slug: "geo-riot" }, { slug: "geo-riot" }, { slug: "geo-riot" }]);
  });

  it("accepts generated shirts: an owner's listed, a shopper's unlisted", () => {
    const { sqlite, db } = oldDatabase();
    runMigrations(db);
    expect(() =>
      insertShirt(sqlite, `('owner-1', 'Owner One', 'polo', 48, 'x', 'owner', 'v1:polo:48:1', 1)`),
    ).not.toThrow();
    expect(() =>
      insertShirt(sqlite, `('dial-1', 'Dial One', 'polo', 60, 'x', 'dial', 'v1:polo:60:7', 0)`),
    ).not.toThrow();
  });

  it.each([
    ["a catalog shirt with a recipe", `('c', 'C', 'polo', 1, 'x', 'catalog', 'v1:polo:1:1', 1)`],
    ["an owner shirt without one", `('o', 'O', 'polo', 1, 'x', 'owner', NULL, 1)`],
    ["a dial shirt without one", `('d', 'D', 'polo', 1, 'x', 'dial', NULL, 0)`],
    ["an unlisted owner shirt", `('u', 'U', 'polo', 1, 'x', 'owner', 'v1:polo:1:2', 0)`],
    ["an unknown origin", `('z', 'Z', 'polo', 1, 'x', 'factory', 'v1:polo:1:3', 1)`],
  ])("refuses %s", (_name, values) => {
    const { sqlite, db } = oldDatabase();
    runMigrations(db);
    expect(() => insertShirt(sqlite, values)).toThrow(/CHECK constraint failed/);
  });

  it("holds each recipe once", () => {
    const { sqlite, db } = oldDatabase();
    runMigrations(db);
    insertShirt(sqlite, `('a', 'A', 'polo', 60, 'x', 'dial', 'v1:polo:60:9', 0)`);
    expect(() =>
      insertShirt(sqlite, `('b', 'B', 'polo', 60, 'x', 'dial', 'v1:polo:60:9', 0)`),
    ).toThrow(/UNIQUE constraint failed/);
  });
});
