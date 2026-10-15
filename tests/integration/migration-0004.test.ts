import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore } from "../helpers/migrations";

describe("migration 0004 (order_drains: every stream an order emptied)", () => {
  it("adds order_drains, keyed by order and stream, without touching existing orders", () => {
    const { sqlite, db } = databaseBefore("0004");
    sqlite.exec(`
      INSERT INTO users (id, email, password_hash) VALUES (1, 'old@x.io', 'h');
      INSERT INTO revenue_streams (id, user_id, preset, amount_usd, schedule, starts_at, payments_made)
        VALUES (1, 1, 'college_fund', '300.00', 'one_time', '2026-10-14T12:00:00.000Z', 1);
      INSERT INTO orders (id, user_id, checkout_token, subtotal_usd, total_usd, payment_method, card_brand, card_last4, per_diem_drained)
        VALUES (1, 1, 'tok', '344.61', '344.61', 'card', 'Visa', '4242', 1);
    `);
    const orders = () => sqlite.prepare("SELECT * FROM orders").all();
    const before = orders();

    runMigrations(db);

    expect(orders()).toEqual(before);
    const insert = (orderId: number, streamId: number) =>
      sqlite
        .prepare("INSERT INTO order_drains (order_id, stream_id) VALUES (?, ?)")
        .run(orderId, streamId);
    insert(1, 1);
    expect(() => insert(1, 1)).toThrow(/UNIQUE constraint failed/); // one achievement per stream
    expect(() => insert(1, 99)).toThrow(/FOREIGN KEY constraint failed/);
    expect(() => insert(99, 1)).toThrow(/FOREIGN KEY constraint failed/);
    expect(() => sqlite.exec("DELETE FROM orders WHERE id = 1")).toThrow(
      /FOREIGN KEY constraint failed/,
    );
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
  });
});
