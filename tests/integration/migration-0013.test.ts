import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore } from "../helpers/migrations";

/**
 * An old database: a catalog shirt, two shopper-made shirts (one bought twice, by two people, one
 * never bought), an order line for each bought shirt, and a cart line.
 */
function oldDatabase() {
  const { sqlite, db } = databaseBefore("0013");
  sqlite.exec(`
    INSERT INTO store_settings (id, pattern_generator) VALUES (1, 0);
    INSERT INTO shirts (id, slug, name, style, complexity, description, origin, recipe, listed) VALUES
      (1, 'geo-riot', 'Geo Riot', 'polo', 15, 'Loud.', 'catalog', NULL, 1),
      (2, 'made-a', 'Made A', 'polo', 60, 'x', 'dial', 'v1:polo:60:1', 0),
      (3, 'made-b', 'Made B', 'polo', 61, 'x', 'dial', 'v1:polo:61:1', 0);
    INSERT INTO users (id, email, password_hash) VALUES (1, 'first@x.io', 'h'), (2, 'later@x.io', 'h');
    INSERT INTO carts (id, user_id) VALUES ('cart-1', 1);
    INSERT INTO cart_items (cart_id, shirt_id, size, quantity) VALUES ('cart-1', 2, 'M', 1);
    INSERT INTO orders (id, user_id, checkout_token, subtotal_usd, total_usd, payment_method, card_brand, card_last4) VALUES
      (1, 2, 'tok-later', '100.00', '100.00', 'card', 'Visa', '4242'),
      (2, 1, 'tok-first', '100.00', '100.00', 'card', 'Visa', '4242');
    INSERT INTO order_items (order_id, shirt_id, shirt_name, tier_name, complexity, size, quantity, final_price_usd, msrp_usd) VALUES
      (2, 2, 'Made A', 'Complicated', 60, 'M', 1, '100.00', '100.00'),
      (1, 2, 'Made A', 'Complicated', 60, 'M', 1, '100.00', '100.00');
  `);
  return { sqlite, db };
}

describe("migration 0013 (made to order, and the Uniquity Surcharge)", () => {
  it("gives a bought shopper-made shirt the account on its earliest order, and nothing else one", () => {
    const { sqlite, db } = oldDatabase();
    const before = sqlite.prepare("SELECT * FROM shirts ORDER BY id").all() as object[];
    runMigrations(db);
    expect(sqlite.prepare("SELECT * FROM shirts ORDER BY id").all()).toEqual([
      { ...before[0], maker_user_id: null },
      // Order 1 (by user 2) came first, though user 1's order holds the lower line id.
      { ...before[1], maker_user_id: 2 },
      { ...before[2], maker_user_id: null },
    ]);
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
  });

  it("adds the surcharge settings, on at $499.99, and leaves the rest alone", () => {
    const { sqlite, db } = oldDatabase();
    runMigrations(db);
    expect(sqlite.prepare("SELECT * FROM store_settings").get()).toMatchObject({
      pattern_generator: 0,
      uniquity_surcharge: 1,
      uniquity_surcharge_usd: "499.99",
    });
  });

  it("keeps every order as it was, with nothing surcharged", () => {
    const { sqlite, db } = oldDatabase();
    const orders = sqlite.prepare("SELECT * FROM orders ORDER BY id").all() as object[];
    const items = sqlite.prepare("SELECT * FROM order_items ORDER BY id").all() as object[];
    runMigrations(db);
    expect(sqlite.prepare("SELECT * FROM orders ORDER BY id").all()).toEqual(
      orders.map((o) => ({ ...o, surcharge_usd: "0.00" })),
    );
    expect(sqlite.prepare("SELECT * FROM order_items ORDER BY id").all()).toEqual(
      items.map((i) => ({ ...i, surcharge_usd: "0.00" })),
    );
    expect(sqlite.prepare("SELECT * FROM cart_items").all()).toHaveLength(1);
  });

  it.each([
    ["a catalog shirt with a maker", "UPDATE shirts SET maker_user_id = 1 WHERE id = 1"],
    ["a maker nobody is", "UPDATE shirts SET maker_user_id = 99 WHERE id = 3"],
    ["a surcharge that isn't money", "UPDATE store_settings SET uniquity_surcharge_usd = 'lots'"],
    ["a negative surcharge", "UPDATE store_settings SET uniquity_surcharge_usd = '-1.00'"],
    ["an order surcharge that isn't money", "UPDATE orders SET surcharge_usd = '1.5' WHERE id = 1"],
    [
      "a line surcharge that isn't money",
      "UPDATE order_items SET surcharge_usd = 'x' WHERE id = 1",
    ],
  ])("refuses %s", (_name, statement) => {
    const { sqlite, db } = oldDatabase();
    runMigrations(db);
    sqlite.pragma("foreign_keys = ON");
    expect(() => sqlite.exec(statement)).toThrow(/constraint failed/);
  });
});
