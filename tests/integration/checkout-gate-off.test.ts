import { describe, expect, it } from "vitest";
import { addToCartCore } from "@/lib/actions/cart";
import { placeOrderCore } from "@/lib/actions/checkout";
import { FakeCookieJar, form } from "../helpers/cookies";
import { createSeededTestDb } from "../helpers/db";

const TOKEN = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const checkout = (extra: Record<string, string> = {}) =>
  form({
    checkoutToken: TOKEN,
    expectedTotalUsd: "424.26",
    method: "card",
    cardNumber: "4242 4242 4242 4242",
    expiry: "12/29",
    cvc: "123",
    ...extra,
  });

describe("checkout with the gate switched off (FR-021)", () => {
  function guestWithCart() {
    const test = createSeededTestDb();
    test.sqlite.prepare("UPDATE store_settings SET checkout_gate = 0").run();
    const jar = new FakeCookieJar();
    addToCartCore(test.db, jar, form({ slug: "geo-riot", size: "M" }));
    return { ...test, jar };
  }

  it("lets a guest pay by card, recording an order with no owner", () => {
    const { db, sqlite, jar } = guestWithCart();
    expect(placeOrderCore(db, jar, checkout())).toEqual({
      ok: true,
      redirectTo: expect.stringMatching(/^\/orders\/\d+$/),
    });
    expect(sqlite.prepare("SELECT user_id, total_usd FROM orders").get()).toEqual({
      user_id: null,
      total_usd: "424.26",
    });
  });

  it("still refuses Flash Credit for a guest", () => {
    const { db, sqlite, jar } = guestWithCart();
    expect(placeOrderCore(db, jar, checkout({ method: "flash_credit" }))).toMatchObject({
      ok: false,
      code: "SIGN_IN_REQUIRED",
    });
    expect(sqlite.prepare("SELECT count(*) AS n FROM orders").get()).toEqual({ n: 0 });
  });
});
