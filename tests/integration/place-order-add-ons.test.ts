import { describe, expect, it } from "vitest";
import { signUpCore } from "@/lib/actions/auth";
import { placeOrderCore } from "@/lib/actions/checkout";
import { addItem, getOrCreateCart, updateItem } from "@/lib/cart/cart";
import { placeOrder, type PlaceOrderInput } from "@/lib/checkout/place-order";
import { listOfferedAddOns } from "@/lib/data/add-ons";
import { getSettings } from "@/lib/data/settings";
import { getBalanceUsd, topUp } from "@/lib/flash-credit/ledger";
import { getOrderForUser, listOrdersForUser } from "@/lib/orders/orders";
import { connectStream } from "@/lib/streams/streams";
import { FakeCookieJar, form } from "../helpers/cookies";
import { createSeededTestDb, setSwitches } from "../helpers/db";

const CARD = { number: "4242 4242 4242 4242", expiry: "12/39", cvc: "123" };
// Geo Riot is $425.00 in the test catalog; the four add-ons are $49.99, $89.99, $29.99, $19.99.
const GEO_RIOT = "425.00";

function setup() {
  const test = createSeededTestDb();
  const userId = (
    test.sqlite
      .prepare("INSERT INTO users (email, password_hash) VALUES ('dan@x.io', 'h') RETURNING id")
      .get() as { id: number }
  ).id;
  const addOns = listOfferedAddOns(test.db, getSettings(test.db));
  const [protection, insurance, warranty, compliments] = addOns;
  let token = 0;
  /** Exactly one Geo Riot in the cart, however many attempts came before. */
  const cart = () => {
    const cartId = getOrCreateCart(test.db, { cartId: null, userId }).id;
    addItem(test.db, cartId, { slug: "geo-riot", size: "M" });
    updateItem(test.db, cartId, { slug: "geo-riot", size: "M", quantity: 1 });
  };
  const place = (patch: Partial<PlaceOrderInput>) => {
    cart();
    return placeOrder(test.db, {
      userId,
      cartId: null,
      checkoutToken: `tok-${++token}`,
      expectedTotalUsd: GEO_RIOT,
      useFlashCredit: false,
      card: CARD,
      ...patch,
    });
  };
  const rows = (orderId: number) =>
    test.sqlite
      .prepare(
        "SELECT add_on_id, name, price_usd, position FROM order_add_ons WHERE order_id = ? ORDER BY position",
      )
      .all(orderId);
  const ledger = () => test.sqlite.prepare("SELECT count(*) AS n FROM flash_credit_entries").get();
  return {
    ...test,
    userId,
    addOns,
    protection,
    insurance,
    warranty,
    compliments,
    place,
    rows,
    ledger,
  };
}

describe("placeOrder with add-ons", () => {
  it("charges the shirts plus the ticked add-ons by card, and records each as its own line", () => {
    const { db, userId, protection, insurance, place, rows } = setup();
    const result = place({
      addOnIds: [protection.id, insurance.id],
      expectedTotalUsd: "564.98", // 425.00 + 49.99 + 89.99
    });
    if (!result.ok) throw new Error(result.code);
    const order = getOrderForUser(db, result.orderId, userId)!;
    expect(order).toMatchObject({ subtotalUsd: GEO_RIOT, totalUsd: "564.98" });
    expect(order.addOns).toEqual([
      { name: "Pattern Protection Plan™", priceUsd: "49.99" },
      { name: "Complexity Insurance", priceUsd: "89.99" },
    ]);
    expect(rows(result.orderId)).toEqual([
      {
        add_on_id: protection.id,
        name: "Pattern Protection Plan™",
        price_usd: "49.99",
        position: 1,
      },
      { add_on_id: insurance.id, name: "Complexity Insurance", price_usd: "89.99", position: 2 },
    ]);
    expect(listOrdersForUser(db, userId)[0].addOns).toHaveLength(2);
  });

  it("covers the whole total, add-ons included, with Flash Credit as one spend entry", () => {
    const { db, sqlite, userId, addOns, place } = setup();
    topUp(db, userId, { amountInput: "1000.00", card: CARD });
    const result = place({
      addOnIds: addOns.map((a) => a.id),
      expectedTotalUsd: "614.96",
      useFlashCredit: true,
      expectedCreditUsd: "614.96",
    });
    expect(result.ok).toBe(true);
    expect(getBalanceUsd(db, userId)).toBe("385.04");
    expect(
      sqlite.prepare("SELECT amount_usd FROM flash_credit_entries WHERE kind = 'spend'").all(),
    ).toEqual([{ amount_usd: "-614.96" }]);
  });

  it("splits the whole total, add-ons included, and still needs his say-so", () => {
    const { db, userId, addOns, place } = setup();
    topUp(db, userId, { amountInput: "100.00", card: CARD });
    const split = {
      addOnIds: addOns.map((a) => a.id),
      expectedTotalUsd: "614.96",
      useFlashCredit: true,
      expectedCreditUsd: "100.00",
    };
    expect(place(split)).toMatchObject({
      ok: false,
      code: "SPLIT_CONFIRMATION_REQUIRED",
      creditUsd: "100.00",
      cardUsd: "514.96",
    });
    const result = place({ ...split, confirmSplit: true });
    if (!result.ok) throw new Error(result.code);
    expect(getOrderForUser(db, result.orderId, userId)!.payment).toMatchObject({
      method: "split",
      creditUsd: "100.00",
      cardUsd: "514.96",
    });
  });

  it("refuses, charging nothing, when an add-on was retired, repriced, unknown, or the total is stale", () => {
    const { sqlite, protection, insurance, place, ledger } = setup();
    const orders = () => sqlite.prepare("SELECT count(*) AS n FROM orders").get();
    const before = { orders: orders(), ledger: ledger() };

    sqlite.prepare("UPDATE add_ons SET price_usd = '59.99' WHERE id = ?").run(protection.id);
    expect(place({ addOnIds: [protection.id], expectedTotalUsd: "474.99" })).toEqual({
      ok: false,
      code: "PRICE_CHANGED",
      totalUsd: "484.99",
    });
    sqlite.prepare("UPDATE add_ons SET active = 0 WHERE id = ?").run(insurance.id);
    expect(
      place({ addOnIds: [protection.id, insurance.id], expectedTotalUsd: "574.24" }),
    ).toMatchObject({ ok: false, code: "PRICE_CHANGED", totalUsd: "484.99" });
    expect(place({ addOnIds: [999], expectedTotalUsd: GEO_RIOT })).toMatchObject({
      code: "PRICE_CHANGED",
    });
    expect(place({ addOnIds: [], expectedTotalUsd: "474.99" })).toMatchObject({
      code: "PRICE_CHANGED",
      totalUsd: GEO_RIOT,
    });
    expect({ orders: orders(), ledger: ledger() }).toEqual(before);
    expect(sqlite.prepare("SELECT count(*) AS n FROM order_add_ons").get()).toEqual({ n: 0 });
  });

  it("charges an add-on named twice once (a tampered form), without an error", () => {
    const { db, userId, protection, place } = setup();
    const result = place({
      addOnIds: [protection.id, protection.id],
      expectedTotalUsd: "474.99",
    });
    if (!result.ok) throw new Error(result.code);
    expect(getOrderForUser(db, result.orderId, userId)!.addOns).toHaveLength(1);
  });

  it("charges no add-ons while pre-checked add-ons are off", () => {
    const { db, userId, addOns, place, rows } = setup();
    setSwitches(db, { preCheckedAddOns: false });
    const result = place({ addOnIds: addOns.map((a) => a.id), expectedTotalUsd: GEO_RIOT });
    if (!result.ok) throw new Error(result.code);
    expect(getOrderForUser(db, result.orderId, userId)!.totalUsd).toBe(GEO_RIOT);
    expect(rows(result.orderId)).toEqual([]);
    expect(place({ addOnIds: addOns.map((a) => a.id), expectedTotalUsd: "614.96" })).toMatchObject({
      code: "PRICE_CHANGED", // a stale page that still showed them
      totalUsd: GEO_RIOT,
    });
  });

  it("returns the same order for a replayed checkout, charged once", () => {
    const { db, sqlite, userId, protection } = setup();
    const cartId = getOrCreateCart(db, { cartId: null, userId }).id;
    addItem(db, cartId, { slug: "geo-riot", size: "M" });
    const input: PlaceOrderInput = {
      userId,
      cartId: null,
      checkoutToken: "tok-replay",
      expectedTotalUsd: "474.99",
      useFlashCredit: false,
      card: CARD,
      addOnIds: [protection.id],
    };
    const first = placeOrder(db, input);
    const again = placeOrder(db, input);
    expect(again).toEqual(first);
    expect(sqlite.prepare("SELECT count(*) AS n FROM order_add_ons").get()).toEqual({ n: 1 });
  });

  it("keeps the order as it was when the owner renames or reprices an add-on later", () => {
    const { db, sqlite, userId, protection, place } = setup();
    const result = place({ addOnIds: [protection.id], expectedTotalUsd: "474.99" });
    if (!result.ok) throw new Error(result.code);
    sqlite
      .prepare(
        "UPDATE add_ons SET name = 'Pattern Protection Plan™ Plus', price_usd = '99.99' WHERE id = ?",
      )
      .run(protection.id);
    expect(getOrderForUser(db, result.orderId, userId)).toMatchObject({
      totalUsd: "474.99",
      addOns: [{ name: "Pattern Protection Plan™", priceUsd: "49.99" }],
    });
  });

  it("counts the whole total, add-ons included, against the per diem", () => {
    const { db, userId, addOns, place } = setup();
    connectStream(db, userId, {
      preset: "per_diem",
      customName: "",
      amountUsd: "500.00",
      schedule: "recurring",
      intervalCount: "1",
      intervalUnit: "days",
      startsAt: "",
      endsAt: "",
      ongoing: true,
    });
    // $425.00 alone would leave $75.74; with the add-ons ($614.96) the per diem runs dry.
    const result = place({ addOnIds: addOns.map((a) => a.id), expectedTotalUsd: "614.96" });
    if (!result.ok) throw new Error(result.code);
    expect(getOrderForUser(db, result.orderId, userId)!.perDiemDrained).toBe(true);
  });
});

describe("placeOrderCore and addOnId fields", () => {
  it("reads every ticked addOnId from the form", async () => {
    const { db, sqlite } = createSeededTestDb();
    const jar = new FakeCookieJar();
    await signUpCore(db, jar, form({ email: "g@x.io", password: "complicated", displayName: "G" }));
    const userId = (sqlite.prepare("SELECT id FROM users").get() as { id: number }).id;
    const cartId = getOrCreateCart(db, { cartId: null, userId }).id;
    addItem(db, cartId, { slug: "geo-riot", size: "M" });
    const [protection, insurance] = listOfferedAddOns(db, getSettings(db));
    const body = form({
      checkoutToken: "11111111-2222-3333-4444-555555555555",
      expectedTotalUsd: "564.98",
      cardNumber: CARD.number,
      expiry: CARD.expiry,
      cvc: CARD.cvc,
    });
    body.append("addOnId", String(protection.id));
    body.append("addOnId", String(insurance.id));
    body.append("addOnId", "not-a-number");
    const state = placeOrderCore(db, jar, body);
    expect(state).toMatchObject({ ok: true, redirectTo: expect.stringMatching(/^\/orders\/\d+$/) });
  });
});
