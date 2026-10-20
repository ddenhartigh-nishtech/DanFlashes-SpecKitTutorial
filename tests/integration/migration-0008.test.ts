import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore, withoutOldDials } from "../helpers/migrations";

describe("migration 0008 (add-ons and the checkout squeeze switches)", () => {
  function migrated() {
    const { sqlite, db } = databaseBefore("0008");
    sqlite.exec(`
      INSERT INTO store_settings (id, confirmshaming) VALUES (1, 0);
      INSERT INTO users (id, email, password_hash) VALUES (1, 'old@x.io', 'h');
      INSERT INTO orders (id, user_id, checkout_token, subtotal_usd, total_usd, payment_method, card_brand, card_last4)
        VALUES (1, 1, 'tok', '344.61', '344.61', 'card', 'Visa', '4242');
    `);
    const settingsBefore = sqlite.prepare("SELECT * FROM store_settings").get() as object;
    runMigrations(db);
    return { sqlite, settingsBefore };
  }
  const addOn = (
    sqlite: import("better-sqlite3").Database,
    patch: Record<string, unknown> = {},
  ) => {
    const row = {
      name: "Pattern Protection Plan™",
      pitch: "Every shape covered.",
      decline_line: "No thanks.",
      price_usd: "49.99",
      ...patch,
    };
    return sqlite
      .prepare(
        "INSERT INTO add_ons (name, pitch, decline_line, price_usd) VALUES (@name, @pitch, @decline_line, @price_usd) RETURNING id",
      )
      .get(row) as { id: number };
  };

  it("turns both switches on for the existing settings row, leaving the rest alone", () => {
    const { sqlite, settingsBefore } = migrated();
    expect(sqlite.prepare("SELECT * FROM store_settings").get()).toMatchObject({
      ...withoutOldDials(settingsBefore),
      pre_checked_add_ons: 1,
      roach_motel: 1,
    });
  });

  it("guards add_ons: names, lines, exact positive money, one of each name", () => {
    const { sqlite } = migrated();
    const ok = addOn(sqlite);
    expect(ok.id).toBeGreaterThan(0);
    expect(sqlite.prepare("SELECT active, position FROM add_ons WHERE id = ?").get(ok.id)).toEqual({
      active: 1,
      position: 0,
    });
    const refuses = (patch: Record<string, unknown>) =>
      expect(() => addOn(sqlite, { name: "Another", ...patch })).toThrow(/constraint failed/);
    expect(() => addOn(sqlite)).toThrow(/UNIQUE constraint failed/);
    refuses({ name: "" });
    refuses({ name: "x".repeat(61) });
    refuses({ pitch: "" });
    refuses({ decline_line: "x".repeat(161) });
    refuses({ price_usd: "0.00" });
    refuses({ price_usd: "-5.00" });
    refuses({ price_usd: "49.9" });
    expect(addOn(sqlite, { name: "x".repeat(60), pitch: "y".repeat(160) }).id).toBeGreaterThan(0);
  });

  it("keys order_add_ons by order and add-on, restricts deletes, and snapshots exact money", () => {
    const { sqlite } = migrated();
    const { id } = addOn(sqlite);
    const line = (orderId: number, addOnId: number, price = "49.99") =>
      sqlite
        .prepare(
          "INSERT INTO order_add_ons (order_id, add_on_id, name, price_usd, position) VALUES (?, ?, 'P', ?, 0)",
        )
        .run(orderId, addOnId, price);
    line(1, id);
    expect(() => line(1, id)).toThrow(/UNIQUE constraint failed/);
    expect(() => line(99, id)).toThrow(/FOREIGN KEY constraint failed/);
    expect(() => line(1, 99)).toThrow(/FOREIGN KEY constraint failed/);
    expect(() => sqlite.exec("DELETE FROM add_ons")).toThrow(/FOREIGN KEY constraint failed/);
    expect(() => sqlite.exec("DELETE FROM orders")).toThrow(/FOREIGN KEY constraint failed/);
    sqlite.exec("DELETE FROM order_add_ons");
    expect(() => line(1, id, "0.00")).toThrow(/constraint failed/);
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
  });
});
