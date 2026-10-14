import { describe, expect, it } from "vitest";
import { addToCartCore } from "@/lib/actions/cart";
import { signInCore, signOutCore, signUpCore } from "@/lib/actions/auth";
import { placeOrderCore } from "@/lib/actions/checkout";
import { findSessionUser } from "@/lib/auth/session";
import { findCartId, getCartView } from "@/lib/cart/cart";
import { copy } from "@/lib/copy";
import { CART_COOKIE, SESSION_COOKIE } from "@/lib/http/cookies";
import { FakeCookieJar, form } from "../helpers/cookies";
import { createSeededTestDb } from "../helpers/db";

const TOKEN = "11111111-2222-3333-4444-555555555555";
const signUpForm = (extra: Record<string, string> = {}) =>
  form({ email: "greg@example.com", password: "complicated", displayName: "Greg", ...extra });

describe("signUp / signIn actions", () => {
  it("sign-up starts a session, merges the guest cart, clears the guest cookie, and honors next", async () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    addToCartCore(db, jar, form({ slug: "geo-riot", size: "M" }));

    const state = await signUpCore(db, jar, signUpForm({ next: "/checkout" }));
    expect(state).toEqual({ ok: true, redirectTo: "/checkout" });
    expect(jar.options.get(SESSION_COOKIE)).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    expect(jar.get(CART_COOKIE)).toBeUndefined();

    const user = findSessionUser(db, jar.get(SESSION_COOKIE))!;
    expect(user.email).toBe("greg@example.com");
    expect(getCartView(db, findCartId(db, { cartId: null, userId: user.id })).itemCount).toBe(1);
  });

  it("refuses an off-site next and falls back to /account", async () => {
    const { db } = createSeededTestDb();
    const state = await signUpCore(
      db,
      new FakeCookieJar(),
      signUpForm({ next: "https://evil.example" }),
    );
    expect(state).toEqual({ ok: true, redirectTo: "/account" });
  });

  it("passes sign-up errors through with brand-voice messages", async () => {
    const { db } = createSeededTestDb();
    expect(await signUpCore(db, new FakeCookieJar(), signUpForm({ password: "short" }))).toEqual({
      ok: false,
      code: "WEAK_PASSWORD",
      message: copy.codes.WEAK_PASSWORD,
    });
  });

  it("sign-in starts a session; a wrong password doesn't", async () => {
    const { db } = createSeededTestDb();
    await signUpCore(db, new FakeCookieJar(), signUpForm());
    const bad = new FakeCookieJar();
    expect(
      await signInCore(db, bad, form({ email: "greg@example.com", password: "wrong-wrong" })),
    ).toMatchObject({
      ok: false,
      code: "BAD_CREDENTIALS",
    });
    expect(bad.get(SESSION_COOKIE)).toBeUndefined();

    const good = new FakeCookieJar();
    expect(
      await signInCore(db, good, form({ email: "GREG@example.com", password: "complicated" })),
    ).toEqual({
      ok: true,
      redirectTo: "/account",
    });
    expect(findSessionUser(db, good.get(SESSION_COOKIE))?.email).toBe("greg@example.com");
  });

  it("sign-out deletes the session and the cookie", async () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    await signUpCore(db, jar, signUpForm());
    const token = jar.get(SESSION_COOKIE);
    signOutCore(db, jar);
    expect(jar.get(SESSION_COOKIE)).toBeUndefined();
    expect(findSessionUser(db, token)).toBeNull();
  });
});

describe("placeOrder action", () => {
  const checkoutForm = (extra: Record<string, string> = {}) =>
    form({
      checkoutToken: TOKEN,
      expectedTotalUsd: "424.26",
      cardNumber: "4242 4242 4242 4242",
      expiry: "12/29",
      cvc: "123",
      ...extra,
    });

  it("refuses guests at the gate", () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    addToCartCore(db, jar, form({ slug: "geo-riot", size: "M" }));
    expect(placeOrderCore(db, jar, checkoutForm())).toMatchObject({
      ok: false,
      code: "GATE_SIGN_IN_REQUIRED",
    });
  });

  it("places a signed-in card order and points at the confirmation", async () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    await signUpCore(db, jar, signUpForm());
    addToCartCore(db, jar, form({ slug: "geo-riot", size: "M" }));
    expect(placeOrderCore(db, jar, checkoutForm())).toEqual({
      ok: true,
      redirectTo: expect.stringMatching(/^\/orders\/\d+$/),
    });
  });

  it("explains a price change with the new total", async () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    await signUpCore(db, jar, signUpForm());
    addToCartCore(db, jar, form({ slug: "geo-riot", size: "M" }));
    expect(placeOrderCore(db, jar, checkoutForm({ expectedTotalUsd: "1.00" }))).toEqual({
      ok: false,
      code: "PRICE_CHANGED",
      totalUsd: "424.26",
      message: copy.checkout.priceChanged("$424.26"),
    });
  });

  it("rejects a missing or malformed checkout token", async () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    await signUpCore(db, jar, signUpForm());
    addToCartCore(db, jar, form({ slug: "geo-riot", size: "M" }));
    expect(placeOrderCore(db, jar, checkoutForm({ checkoutToken: "" }))).toMatchObject({
      ok: false,
      code: "PRICE_CHANGED",
    });
  });

  it("passes card errors through", async () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    await signUpCore(db, jar, signUpForm());
    addToCartCore(db, jar, form({ slug: "geo-riot", size: "M" }));
    expect(placeOrderCore(db, jar, checkoutForm({ cardNumber: "4242424242424241" }))).toEqual({
      ok: false,
      code: "CARD_INVALID_NUMBER",
      message: copy.codes.CARD_INVALID_NUMBER,
    });
  });
});
