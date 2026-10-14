import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore } from "../helpers/migrations";

describe("migration 0003 (each recurring top-off gets its own interval)", () => {
  it("keeps the store-wide pay period as each existing recurring stream's interval", () => {
    const { sqlite, db } = databaseBefore("0003");
    sqlite.exec(`
      INSERT INTO store_settings (id, stream_pay_period_minutes) VALUES (1, 7);
      INSERT INTO users (id, email, password_hash) VALUES (1, 'old@x.io', 'h');
      INSERT INTO revenue_streams (id, user_id, preset, amount_usd, schedule, starts_at, next_due_at, payments_made)
        VALUES (1, 1, 'per_diem', '75.00', 'recurring', '2026-10-14T12:00:00.000Z', '2026-10-14T12:07:00.000Z', 1);
      INSERT INTO revenue_streams (id, user_id, custom_name, amount_usd, schedule, starts_at)
        VALUES (2, 1, 'Craig owes me', '40.00', 'whenever', '2026-10-14T12:00:00.000Z');
      INSERT INTO revenue_streams (id, user_id, preset, amount_usd, schedule, starts_at, payments_made)
        VALUES (3, 1, 'college_fund', '2000.00', 'one_time', '2026-10-14T12:00:00.000Z', 1);
      INSERT INTO flash_credit_entries (user_id, amount_usd, kind, stream_id, stream_payment_no)
        VALUES (1, '75.00', 'stream', 1, 1), (1, '2000.00', 'stream', 3, 1);
    `);
    const entries = () => sqlite.prepare("SELECT * FROM flash_credit_entries ORDER BY id").all();
    const before = entries();

    runMigrations(db);

    expect(
      sqlite
        .prepare(
          "SELECT id, schedule, interval_minutes, payments_made, next_due_at FROM revenue_streams ORDER BY id",
        )
        .all(),
    ).toEqual([
      {
        id: 1,
        schedule: "recurring",
        interval_minutes: 7,
        payments_made: 1,
        next_due_at: "2026-10-14T12:07:00.000Z",
      },
      { id: 2, schedule: "whenever", interval_minutes: null, payments_made: 0, next_due_at: null },
      { id: 3, schedule: "one_time", interval_minutes: null, payments_made: 1, next_due_at: null },
    ]);
    expect(entries()).toEqual(before);
    const columns = (
      sqlite.prepare("PRAGMA table_info(store_settings)").all() as { name: string }[]
    ).map((c) => c.name);
    expect(columns).not.toContain("stream_pay_period_minutes");
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
  });

  it("requires an interval on recurring streams, and only on them", () => {
    const { sqlite, db } = databaseBefore("0003");
    sqlite.exec("INSERT INTO users (id, email, password_hash) VALUES (1, 'x@x.io', 'h');");
    runMigrations(db);
    const insert = (schedule: string, interval: number | null) =>
      sqlite
        .prepare(
          "INSERT INTO revenue_streams (user_id, custom_name, amount_usd, schedule, interval_minutes, starts_at) VALUES (1, 'x', '1.00', ?, ?, '2026-10-14T12:00:00.000Z')",
        )
        .run(schedule, interval);
    expect(() => insert("recurring", null)).toThrow(/CHECK constraint failed/);
    expect(() => insert("recurring", 0)).toThrow(/CHECK constraint failed/);
    expect(() => insert("whenever", 5)).toThrow(/CHECK constraint failed/);
    insert("recurring", 1440);
    insert("one_time", null);
    // CHECKs pass on NULL in SQLite, so the stream rules say IS NOT NULL explicitly.
    expect(() =>
      sqlite
        .prepare(
          "INSERT INTO flash_credit_entries (user_id, amount_usd, kind, stream_id, stream_payment_no) VALUES (1, '1.00', 'stream', 1, NULL)",
        )
        .run(),
    ).toThrow(/CHECK constraint failed/);
  });
});
