import { describe, expect, it } from "vitest";
import { auditIssues } from "@/lib/catalog/audit";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore, withoutOldDials } from "../helpers/migrations";

/**
 * An old store on the exponential: tuned, with four shirts Dan priced himself (catalog, generated
 * and shopper-made, one resting) and one he didn't, a cart, and orders paid by card, by Flash
 * Credit, and split with add-ons, a surcharge and a drain.
 */
function oldDatabase() {
  const { sqlite, db } = databaseBefore("0014");
  sqlite.exec(`
    INSERT INTO store_settings (id, msrp_start_price_usd, msrp_anchor_score, msrp_doubling_interval,
      pattern_generator, uniquity_surcharge_usd, flash_credit_presets_usd)
      VALUES (1, '350.00', 12, 8, 0, '123.45', '["5.00","10.00"]');
    INSERT INTO complexity_tiers (id, name, min_score, badge_bg_color, badge_text_color) VALUES
      (1, 'BLAND', 0, '#C8B89A', '#3B3B3B'), (2, 'Complicated', 10, '#FF2D95', '#FFFFFF');
    INSERT INTO users (id, email, password_hash) VALUES (1, 'guy@x.io', 'h');
    INSERT INTO shirts (id, slug, name, style, complexity, final_price_usd, description, status, origin, recipe, listed, maker_user_id, updated_at) VALUES
      (1, 'hawaiian', 'Hawaiian', 'button-down', 22, '1040.00', 'Loud.', 'active', 'catalog', NULL, 1, NULL, '2026-01-01T00:00:00.000Z'),
      (2, 'generated', 'Generated', 'polo', 133, '1300000.00', 'x', 'active', 'owner', 'v1:polo:133:1', 1, NULL, '2026-01-01T00:00:00.000Z'),
      (3, 'made', 'Made', 'polo', 188, '68000000.00', 'x', 'active', 'dial', 'v1:polo:188:1', 0, 1, '2026-01-01T00:00:00.000Z'),
      (4, 'resting', 'Resting', 'polo', 40, '9000.00', 'x', 'inactive', 'catalog', NULL, 1, NULL, '2026-01-01T00:00:00.000Z'),
      (5, 'unpriced', 'Unpriced', 'polo', 12, NULL, 'x', 'active', 'catalog', NULL, 1, NULL, '2026-01-01T00:00:00.000Z');
    INSERT INTO carts (id, user_id) VALUES ('cart-1', 1);
    INSERT INTO cart_items (cart_id, shirt_id, size, quantity) VALUES ('cart-1', 1, 'M', 2), ('cart-1', 3, 'XL', 1);
    INSERT INTO add_ons (id, name, pitch, decline_line, price_usd) VALUES (1, 'Wrap', 'p', 'd', '9.99');
    INSERT INTO revenue_streams (id, user_id, custom_name, amount_usd, schedule, starts_at) VALUES
      (1, 1, 'Side hustle', '50.00', 'one_time', '2026-01-01T00:00:00.000Z');
    INSERT INTO orders (id, user_id, checkout_token, subtotal_usd, total_usd, payment_method, card_brand, card_last4, flash_credit_usd, surcharge_usd) VALUES
      (1, 1, 'tok-1', '2080.00', '2080.00', 'card', 'Visa', '4242', '0.00', '0.00'),
      (2, 1, 'tok-2', '1300000.00', '1300000.00', 'flash_credit', NULL, NULL, '1300000.00', '0.00'),
      (3, 1, 'tok-3', '68000000.00', '68000633.44', 'split', 'Visa', '4242', '500.00', '623.45');
    INSERT INTO order_items (order_id, shirt_id, shirt_name, tier_name, complexity, size, quantity, final_price_usd, msrp_usd, surcharge_usd) VALUES
      (1, 1, 'Hawaiian', 'Complicated', 22, 'M', 2, '1040.00', '689.22', '0.00'),
      (2, 2, 'Generated', 'Complicated', 133, 'L', 1, '1300000.00', '1512830.26', '0.00'),
      (3, 3, 'Made', 'Complicated', 188, 'XL', 1, '68000000.00', '68462882.06', '623.45');
    INSERT INTO order_add_ons (order_id, add_on_id, name, price_usd, position) VALUES (3, 1, 'Wrap', '9.99', 1);
    INSERT INTO order_drains (order_id, stream_id) VALUES (3, 1);
  `);
  return { sqlite, db };
}

const rows = (sqlite: ReturnType<typeof oldDatabase>["sqlite"], table: string) =>
  sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all() as Record<string, unknown>[];

describe("migration 0014 (the gentler pricing curve)", () => {
  it("puts the store on the default line, dropping the exponential's dials (010 FR-007)", () => {
    const { sqlite, db } = oldDatabase();
    const [before] = rows(sqlite, "store_settings");
    runMigrations(db);
    const [after] = rows(sqlite, "store_settings");
    expect(after).toEqual({
      ...withoutOldDials(before),
      msrp_base_price_usd: "50.00",
      msrp_per_point_usd: "25.00",
    });
    expect(after).not.toHaveProperty("msrp_start_price_usd");
  });

  it("clears every price Dan set, and touches nothing else on a shirt (Q2)", () => {
    const { sqlite, db } = oldDatabase();
    const before = rows(sqlite, "shirts");
    runMigrations(db);
    const after = rows(sqlite, "shirts");
    after.forEach((shirt, i) => {
      const old = before[i];
      expect(shirt.final_price_usd).toBeNull();
      // owner_changed_at is 0015's (Dan's mark), not this migration's.
      expect({
        ...shirt,
        final_price_usd: null,
        updated_at: null,
        owner_changed_at: undefined,
      }).toEqual({
        ...old,
        final_price_usd: null,
        updated_at: null,
      });
      if (old.final_price_usd === null) expect(shirt.updated_at).toBe(old.updated_at);
      else {
        expect(String(shirt.updated_at)).toMatch(/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
        expect(shirt.updated_at).not.toBe(old.updated_at);
      }
    });
  });

  it("leaves every order, line, add-on, drain and cart exactly as it was (FR-008)", () => {
    const { sqlite, db } = oldDatabase();
    const tables = [
      "orders",
      "order_items",
      "order_add_ons",
      "order_drains",
      "carts",
      "cart_items",
    ];
    const before = tables.map((t) => rows(sqlite, t));
    runMigrations(db);
    expect(tables.map((t) => rows(sqlite, t))).toEqual(before);
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
  });

  it("leaves a catalog the audit finds no errors in (FR-016, analysis C3)", () => {
    const { db } = oldDatabase();
    runMigrations(db);
    // The fixture's shirts have no pictures; every other error would be about the reprice.
    const errors = auditIssues(db).filter(
      (issue) => issue.level === "error" && !issue.text.includes(" images: "),
    );
    expect(errors).toEqual([]);
    expect(auditIssues(db).filter((i) => i.level === "error")).toHaveLength(4);
  });

  it.each([
    ["a free base price", "UPDATE store_settings SET msrp_base_price_usd = '0.00'"],
    ["a negative base price", "UPDATE store_settings SET msrp_base_price_usd = '-1.00'"],
    ["a base price that isn't money", "UPDATE store_settings SET msrp_base_price_usd = 'abc'"],
    ["a free point", "UPDATE store_settings SET msrp_per_point_usd = '0.00'"],
    ["a negative point", "UPDATE store_settings SET msrp_per_point_usd = '-1.00'"],
    ["a point that isn't money", "UPDATE store_settings SET msrp_per_point_usd = 'abc'"],
  ])("refuses %s", (_name, statement) => {
    const { sqlite, db } = oldDatabase();
    runMigrations(db);
    expect(() => sqlite.prepare(statement).run()).toThrow(/CHECK constraint failed/);
  });
});
