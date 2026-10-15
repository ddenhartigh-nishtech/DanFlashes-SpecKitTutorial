import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore } from "../helpers/migrations";

describe("migration 0005 (which drain's GONE pop he cleared)", () => {
  it("adds dismissed_drain_payment_no, NULL on existing streams, without touching them", () => {
    const { sqlite, db } = databaseBefore("0005");
    sqlite.exec(`
      INSERT INTO users (id, email, password_hash) VALUES (1, 'old@x.io', 'h');
      INSERT INTO revenue_streams (id, user_id, preset, amount_usd, schedule, starts_at, payments_made)
        VALUES (1, 1, 'college_fund', '300.00', 'one_time', '2026-10-14T12:00:00.000Z', 1);
    `);
    const before = sqlite.prepare("SELECT * FROM revenue_streams").all() as object[];

    runMigrations(db);

    expect(sqlite.prepare("SELECT * FROM revenue_streams").all()).toEqual(
      before.map((row) => ({ ...row, dismissed_drain_payment_no: null })),
    );
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
  });
});
