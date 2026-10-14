import { describe, expect, it } from "vitest";
import { addItem, getOrCreateCart } from "@/lib/cart/cart";
import { placeOrder, type PlaceOrderInput } from "@/lib/checkout/place-order";
import { getBalanceUsd, listEntries, topUp } from "@/lib/flash-credit/ledger";
import { sum } from "@/lib/money";
import { describePayment, getOrderForUser } from "@/lib/orders/orders";
import { connectStream, getPerDiemMeter } from "@/lib/streams/streams";
import { getSettings } from "@/lib/data/settings";
import { createSeededTestDb } from "../helpers/db";

const NOW = new Date("2026-10-14T12:00:00.000Z");
const CARD = { number: "4242 4242 4242 4242", expiry: "12/39", cvc: "123" };

/** $155.39 of Flash Credit against a Geo Riot ($424.26 in the test catalog): $268.87 on the card. */
function setup(balance = "155.39") {
  const test = createSeededTestDb();
  const userId = (
    test.sqlite
      .prepare("INSERT INTO users (email, password_hash) VALUES ('split@x.io', 'h') RETURNING id")
      .get() as { id: number }
  ).id;
  if (balance !== "0.00") topUp(test.db, userId, { amountInput: balance, card: CARD, now: NOW });
  const cartId = getOrCreateCart(test.db, { cartId: null, userId }).id;
  addItem(test.db, cartId, { slug: "geo-riot", size: "M" });
  const input = (patch: Partial<PlaceOrderInput> = {}): PlaceOrderInput => ({
    userId,
    cartId: null,
    checkoutToken: "split-1",
    expectedTotalUsd: "424.26",
    useFlashCredit: true,
    expectedCreditUsd: balance,
    confirmSplit: true,
    card: CARD,
    now: NOW,
    ...patch,
  });
  const count = (table: string) =>
    (test.sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
  return { ...test, userId, input, count };
}

describe("placeOrder — split between Flash Credit and a card", () => {
  it("deducts exactly the credit applied, puts the rest on the card, and records both", () => {
    const { db, sqlite, userId, input } = setup();
    const result = placeOrder(db, input());
    expect(result).toMatchObject({ ok: true });
    const orderId = (result as { orderId: number }).orderId;

    expect(
      sqlite
        .prepare(
          "SELECT payment_method, flash_credit_usd, total_usd, card_brand, card_last4 FROM orders",
        )
        .get(),
    ).toEqual({
      payment_method: "split",
      flash_credit_usd: "155.39",
      total_usd: "424.26",
      card_brand: "Visa",
      card_last4: "4242",
    });
    const entries = listEntries(db, userId);
    expect(entries.filter((e) => e.kind === "spend")).toMatchObject([
      { amountUsd: "-155.39", orderId },
    ]);
    expect(getBalanceUsd(db, userId)).toBe("0.00");
    expect(getBalanceUsd(db, userId)).toBe(sum(entries.map((e) => e.amountUsd)));
    const { payment } = getOrderForUser(db, orderId, userId)!;
    expect(payment).toEqual({
      method: "split",
      creditUsd: "155.39",
      cardUsd: "268.87",
      brand: "Visa",
      last4: "4242",
    });
    expect(describePayment(payment)).toBe(
      "$155.39 in Flash Credit, $268.87 charged to Visa ending 4242",
    );
  });

  it("won't place a split he hasn't confirmed, and writes nothing", () => {
    const { db, userId, input, count } = setup();
    expect(placeOrder(db, input({ confirmSplit: false }))).toEqual({
      ok: false,
      code: "SPLIT_CONFIRMATION_REQUIRED",
      creditUsd: "155.39",
      cardUsd: "268.87",
    });
    expect(count("orders")).toBe(0);
    expect(getBalanceUsd(db, userId)).toBe("155.39");
  });

  it("refuses when the balance moved since he saw the split, and shows the new one", () => {
    const { db, userId, input, count } = setup();
    topUp(db, userId, { amountInput: "20.00", card: CARD, now: NOW }); // another tab
    expect(placeOrder(db, input())).toEqual({
      ok: false,
      code: "CREDIT_CHANGED",
      creditUsd: "175.39",
      cardUsd: "248.87",
    });
    expect(count("orders")).toBe(0);
  });

  it("counts a top-off that lands at checkout as a changed split", () => {
    const { db, sqlite, userId, input } = setup("0.00");
    connectStream(
      db,
      userId,
      {
        preset: "per_diem",
        customName: "",
        amountUsd: "100.00",
        schedule: "recurring",
        intervalCount: "5",
        intervalUnit: "minutes",
        startsAt: "",
        endsAt: "",
        ongoing: true,
      },
      NOW,
    );
    // He saw $100.00 of credit, but by checkout a second top-off had come due.
    expect(
      placeOrder(
        db,
        input({ expectedCreditUsd: "100.00", now: new Date(NOW.getTime() + 5 * 60_000) }),
      ),
    ).toMatchObject({ ok: false, code: "CREDIT_CHANGED", creditUsd: "200.00", cardUsd: "224.26" });
    expect(sqlite.prepare("SELECT count(*) AS n FROM orders").get()).toEqual({ n: 0 });
  });

  it("deducts nothing when the card in a split is bad", () => {
    const { db, userId, input, count } = setup();
    expect(
      placeOrder(
        db,
        input({ card: { number: "4242 4242 4242 4241", expiry: "12/39", cvc: "123" } }),
      ),
    ).toMatchObject({ ok: false, code: "CARD_INVALID_NUMBER" });
    expect(count("orders")).toBe(0);
    expect(getBalanceUsd(db, userId)).toBe("155.39");
  });

  it("pays by Flash Credit alone when it covers the total: no confirmation, no card", () => {
    const { db, sqlite, input } = setup("424.26");
    expect(
      placeOrder(db, input({ expectedCreditUsd: "424.26", confirmSplit: false, card: undefined })),
    ).toMatchObject({ ok: true });
    expect(sqlite.prepare("SELECT payment_method, flash_credit_usd FROM orders").get()).toEqual({
      payment_method: "flash_credit",
      flash_credit_usd: "424.26",
    });
  });

  it("pays by card alone when he doesn't apply his credit", () => {
    const { db, sqlite, userId, input } = setup();
    expect(
      placeOrder(
        db,
        input({ useFlashCredit: false, expectedCreditUsd: undefined, confirmSplit: false }),
      ),
    ).toMatchObject({ ok: true });
    expect(sqlite.prepare("SELECT payment_method, flash_credit_usd FROM orders").get()).toEqual({
      payment_method: "card",
      flash_credit_usd: "0.00",
    });
    expect(getBalanceUsd(db, userId)).toBe("155.39");
  });

  it("returns the same order for a replayed checkout, charged once", () => {
    const { db, input, count } = setup();
    const first = placeOrder(db, input());
    expect(placeOrder(db, input())).toEqual(first);
    expect(count("orders")).toBe(1);
  });

  it("counts the full total of a split order against the per diem", () => {
    const { db, userId, input } = setup("0.00");
    connectStream(
      db,
      userId,
      {
        preset: "per_diem",
        customName: "",
        amountUsd: "300.00",
        schedule: "recurring",
        intervalCount: "1",
        intervalUnit: "days",
        startsAt: "",
        endsAt: "",
        ongoing: true,
      },
      NOW,
    );
    // $300.00 of per diem credit + $124.26 on the card: the whole $424.26 counts, so it drains.
    const result = placeOrder(db, input({ expectedCreditUsd: "300.00" }));
    expect(result).toMatchObject({ ok: true });
    expect(getPerDiemMeter(db, userId, getSettings(db))).toMatchObject({
      leftUsd: "0.00",
      drained: true,
    });
    const order = getOrderForUser(db, (result as { orderId: number }).orderId, userId)!;
    expect(order).toMatchObject({
      perDiemDrained: true,
      payment: { method: "split", cardUsd: "124.26" },
    });
  });
});
