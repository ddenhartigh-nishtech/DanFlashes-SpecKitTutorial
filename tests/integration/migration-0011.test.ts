import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore } from "../helpers/migrations";

/** An old database with one shopper, a stream, an order and one entry of every 001–009 kind. */
function oldDatabase() {
  const { sqlite, db } = databaseBefore("0011");
  sqlite.exec(`
    INSERT INTO users (id, email, password_hash, display_name) VALUES (1, 'old@x.io', 'h', 'Greg');
    INSERT INTO revenue_streams (id, user_id, custom_name, amount_usd, schedule, starts_at)
      VALUES (1, 1, 'Craig owes me', '40.00', 'whenever', '2026-10-14T12:00:00.000Z');
    INSERT INTO orders (id, user_id, checkout_token, subtotal_usd, total_usd, payment_method, flash_credit_usd)
      VALUES (1, 1, 'tok-1', '300.00', '300.00', 'flash_credit', '300.00');
    INSERT INTO flash_credit_entries (user_id, amount_usd, kind, card_brand, card_last4)
      VALUES (1, '500.00', 'top_up', 'Visa', '4242');
    INSERT INTO flash_credit_entries (user_id, amount_usd, kind, order_id) VALUES (1, '-300.00', 'spend', 1);
    INSERT INTO flash_credit_entries (user_id, amount_usd, kind, stream_id, stream_payment_no)
      VALUES (1, '40.00', 'stream', 1, 1);
  `);
  return { sqlite, db };
}

/** A grant row, optionally with one more column that a grant must never have. */
const grant = (token: string | null, extra?: [column: string, value: string]) =>
  `INSERT INTO flash_credit_entries (user_id, amount_usd, kind, grant_token${extra ? `, ${extra[0]}` : ""})
   VALUES (1, '500.00', 'grant', ${token === null ? "NULL" : `'${token}'`}${extra ? `, ${extra[1]}` : ""})`;

describe("migration 0011 (the admin flag and Flash Credit grants)", () => {
  it("gives every existing account the admin flag, off, and leaves the rest alone", () => {
    const { sqlite, db } = oldDatabase();
    const before = sqlite.prepare("SELECT * FROM users").get() as object;
    runMigrations(db);
    expect(sqlite.prepare("SELECT * FROM users").get()).toEqual({ ...before, is_admin: 0 });
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
  });

  it("keeps every ledger entry exactly as it was through the rebuild", () => {
    const { sqlite, db } = oldDatabase();
    const entries = () =>
      sqlite.prepare("SELECT * FROM flash_credit_entries ORDER BY id").all() as object[];
    const before = entries();
    runMigrations(db);
    expect(entries()).toEqual(before.map((e) => ({ ...e, grant_token: null })));
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
  });

  it("accepts a grant: a positive amount and a token, with no order, card or stream", () => {
    const { sqlite, db } = oldDatabase();
    runMigrations(db);
    expect(() => sqlite.exec(grant("g-1"))).not.toThrow();
    expect(() => sqlite.exec(grant(null))).toThrow(/CHECK constraint failed/);
    expect(() =>
      sqlite.exec(
        "INSERT INTO flash_credit_entries (user_id, amount_usd, kind, grant_token) VALUES (1, '-5.00', 'grant', 'g-neg')",
      ),
    ).toThrow(/CHECK constraint failed/);
    const extras: [string, string][] = [
      ["order_id", "1"],
      ["card_brand", "'Visa'"],
      ["stream_id", "1"],
    ];
    for (const extra of extras) {
      expect(() => sqlite.exec(grant(`g-${extra[0]}`, extra)), extra[0]).toThrow(
        /CHECK constraint failed/,
      );
    }
  });

  it("records each grant token once", () => {
    const { sqlite, db } = oldDatabase();
    runMigrations(db);
    sqlite.exec(grant("same"));
    expect(() => sqlite.exec(grant("same"))).toThrow(/UNIQUE constraint failed/);
  });

  it("refuses a grant token on every other kind of entry", () => {
    const { sqlite, db } = oldDatabase();
    runMigrations(db);
    expect(() =>
      sqlite.exec(
        "INSERT INTO flash_credit_entries (user_id, amount_usd, kind, card_brand, card_last4, grant_token) VALUES (1, '5.00', 'top_up', 'Visa', '4242', 't')",
      ),
    ).toThrow(/CHECK constraint failed/);
    expect(() =>
      sqlite.exec(
        "INSERT INTO flash_credit_entries (user_id, amount_usd, kind, order_id, grant_token) VALUES (1, '-5.00', 'spend', 1, 's')",
      ),
    ).toThrow(/CHECK constraint failed/);
  });
});
