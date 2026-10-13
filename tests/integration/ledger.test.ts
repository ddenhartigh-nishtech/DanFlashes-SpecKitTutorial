import { describe, expect, it } from "vitest";
import { getBalanceUsd, listEntries, topUp } from "@/lib/flash-credit/ledger";
import { createSeededTestDb } from "../helpers/db";

const NOW = new Date("2026-10-13T12:00:00Z");
const CARD = { number: "4242424242424242", expiry: "12/29", cvc: "123" };

function setup() {
  const test = createSeededTestDb();
  const userId = (
    test.sqlite
      .prepare("INSERT INTO users (email, password_hash) VALUES ('fc@x.io', 'h') RETURNING id")
      .get() as {
      id: number;
    }
  ).id;
  return { ...test, userId };
}

describe("Flash Credit ledger", () => {
  it("starts at $0.00", () => {
    const { db, userId } = setup();
    expect(getBalanceUsd(db, userId)).toBe("0.00");
    expect(listEntries(db, userId)).toEqual([]);
  });

  it("a top-up writes a positive entry with the card's brand and last 4", () => {
    const { db, sqlite, userId } = setup();
    expect(topUp(db, userId, { amountInput: "500.00", card: CARD, now: NOW })).toEqual({
      ok: true,
      balanceUsd: "500.00",
    });
    expect(
      sqlite
        .prepare(
          "SELECT kind, amount_usd, card_brand, card_last4, order_id FROM flash_credit_entries",
        )
        .get(),
    ).toEqual({
      kind: "top_up",
      amount_usd: "500.00",
      card_brand: "Visa",
      card_last4: "4242",
      order_id: null,
    });
  });

  it("sums exactly — 0.10 + 0.20 is 0.30, not 0.30000000000000004", () => {
    const { db, userId } = setup();
    topUp(db, userId, { amountInput: "0.10", card: CARD, now: NOW });
    topUp(db, userId, { amountInput: "0.20", card: CARD, now: NOW });
    expect(getBalanceUsd(db, userId)).toBe("0.30");
  });

  it("accepts custom amounts in dollars and cents", () => {
    const { db, userId } = setup();
    expect(topUp(db, userId, { amountInput: "123.45", card: CARD, now: NOW })).toMatchObject({
      balanceUsd: "123.45",
    });
    expect(topUp(db, userId, { amountInput: "$1,000", card: CARD, now: NOW })).toMatchObject({
      balanceUsd: "1123.45",
    });
  });

  it.each(["0", "0.00", "-5.00", "1.005", "lots", ""])(
    "refuses %j with INVALID_AMOUNT and writes nothing",
    (amountInput) => {
      const { db, userId } = setup();
      expect(topUp(db, userId, { amountInput, card: CARD, now: NOW })).toEqual({
        ok: false,
        code: "INVALID_AMOUNT",
      });
      expect(listEntries(db, userId)).toEqual([]);
    },
  );

  it("refuses an invalid card and writes nothing", () => {
    const { db, userId } = setup();
    expect(
      topUp(db, userId, {
        amountInput: "50.00",
        card: { ...CARD, number: "4242424242424241" },
        now: NOW,
      }),
    ).toEqual({ ok: false, code: "CARD_INVALID_NUMBER" });
    expect(getBalanceUsd(db, userId)).toBe("0.00");
  });

  it("lists entries newest first", () => {
    const { db, sqlite, userId } = setup();
    topUp(db, userId, { amountInput: "1.00", card: CARD, now: NOW });
    topUp(db, userId, { amountInput: "2.00", card: CARD, now: NOW });
    sqlite
      .prepare(
        "UPDATE flash_credit_entries SET created_at = '2020-01-01T00:00:00.000Z' WHERE amount_usd = '2.00'",
      )
      .run();
    expect(listEntries(db, userId).map((e) => e.amountUsd)).toEqual(["1.00", "2.00"]);
  });

  it("keeps each user's balance separate", () => {
    const { db, sqlite, userId } = setup();
    const other = (
      sqlite
        .prepare("INSERT INTO users (email, password_hash) VALUES ('o@x.io', 'h') RETURNING id")
        .get() as { id: number }
    ).id;
    topUp(db, userId, { amountInput: "10.00", card: CARD, now: NOW });
    expect(getBalanceUsd(db, other)).toBe("0.00");
  });
});
