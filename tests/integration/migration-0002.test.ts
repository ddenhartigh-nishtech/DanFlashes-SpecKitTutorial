import { describe, expect, it } from "vitest";
import type { Sqlite } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import { sum } from "@/lib/money";
import { databaseBefore } from "../helpers/migrations";

/** A database at migration 0001 holding a top-up, a Flash Credit order + spend, and a card order. */
function populated0001() {
  const { sqlite, db } = databaseBefore("0002");
  sqlite.exec(`
    INSERT INTO store_settings (id) VALUES (1);
    INSERT INTO users (id, email, password_hash) VALUES (1, 'old@x.io', 'h');
    INSERT INTO flash_credit_entries (user_id, amount_usd, kind, card_brand, card_last4)
      VALUES (1, '1000.00', 'top_up', 'Visa', '4242');
    INSERT INTO orders (id, user_id, checkout_token, subtotal_usd, total_usd, payment_method)
      VALUES (1, 1, 'tok-credit', '344.61', '344.61', 'flash_credit');
    INSERT INTO flash_credit_entries (user_id, amount_usd, kind, order_id)
      VALUES (1, '-344.61', 'spend', 1);
    INSERT INTO orders (id, user_id, checkout_token, subtotal_usd, total_usd, payment_method, card_brand, card_last4)
      VALUES (2, 1, 'tok-card', '999.99', '999.99', 'card', 'Visa', '4242');
  `);
  return { sqlite, db };
}

const ledger = (sqlite: Sqlite) =>
  sqlite
    .prepare(
      "SELECT id, user_id, amount_usd, kind, order_id, card_brand, card_last4, created_at FROM flash_credit_entries ORDER BY id",
    )
    .all() as { amount_usd: string }[];

describe("migration 0002 (revenue streams, split payment, per diem drain)", () => {
  it("keeps every ledger row and the balance, and backfills orders and settings", () => {
    const { sqlite, db } = populated0001();
    const before = ledger(sqlite);
    const ordersBefore = sqlite
      .prepare("SELECT id, checkout_token, total_usd, payment_method, card_last4 FROM orders")
      .all();

    runMigrations(db);

    expect(ledger(sqlite)).toEqual(before);
    expect(sum(ledger(sqlite).map((e) => e.amount_usd))).toBe("655.39");
    expect(
      sqlite
        .prepare("SELECT id, checkout_token, total_usd, payment_method, card_last4 FROM orders")
        .all(),
    ).toEqual(ordersBefore);
    expect(
      sqlite.prepare("SELECT id, flash_credit_usd, per_diem_drained FROM orders ORDER BY id").all(),
    ).toEqual([
      { id: 1, flash_credit_usd: "344.61", per_diem_drained: 0 },
      { id: 2, flash_credit_usd: "0.00", per_diem_drained: 0 },
    ]);
    expect(sqlite.prepare("SELECT per_diem_drain FROM store_settings").get()).toEqual({
      per_diem_drain: 1,
    });
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
  });

  it("enforces the new rules", () => {
    const { sqlite, db } = populated0001();
    runMigrations(db);
    const stream = (preset: string | null, name: string | null = null) =>
      sqlite
        .prepare(
          "INSERT INTO revenue_streams (user_id, preset, custom_name, amount_usd, schedule, interval_minutes, starts_at) VALUES (1, ?, ?, '75.00', 'recurring', 5, '2026-10-14T12:00:00.000Z') RETURNING id",
        )
        .get(preset, name) as { id: number };
    const pay = (streamId: number | null, no: number | null) =>
      sqlite
        .prepare(
          "INSERT INTO flash_credit_entries (user_id, amount_usd, kind, stream_id, stream_payment_no) VALUES (1, '75.00', 'stream', ?, ?)",
        )
        .run(streamId, no);

    const perDiem = stream("per_diem");
    expect(() => pay(null, 1)).toThrow(/CHECK constraint failed/);
    pay(perDiem.id, 1);
    expect(() => pay(perDiem.id, 1)).toThrow(/UNIQUE constraint failed/);
    expect(() => stream("per_diem")).toThrow(/UNIQUE constraint failed/);
    expect(() => stream(null, null)).toThrow(/CHECK constraint failed/);
    expect(() => stream(null, " ".repeat(3))).toThrow(/CHECK constraint failed/);
    expect(stream(null, "Craig owes me").id).toBeGreaterThan(perDiem.id);
  });
});
