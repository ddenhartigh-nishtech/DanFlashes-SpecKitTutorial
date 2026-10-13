import { describe, expect, it } from "vitest";
import { addToCartCore, removeCartItemCore, updateCartItemCore } from "@/lib/actions/cart";
import { signUp } from "@/lib/auth/accounts";
import { createSession } from "@/lib/auth/session";
import { getCartView, findCartId } from "@/lib/cart/cart";
import { copy } from "@/lib/copy";
import { CART_COOKIE, SESSION_COOKIE } from "@/lib/http/cookies";
import { FakeCookieJar, form } from "../helpers/cookies";
import { createSeededTestDb } from "../helpers/db";

describe("addToCart action", () => {
  it("gives a new guest an httpOnly, SameSite=Lax df_cart cookie", () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    const state = addToCartCore(db, jar, form({ slug: "geo-riot", size: "M" }));
    expect(state).toEqual({ ok: true, itemCount: 1, message: copy.product.added });
    expect(jar.get(CART_COOKIE)).toEqual(expect.any(String));
    expect(jar.options.get(CART_COOKIE)).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("reuses the guest cart from the cookie", () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    addToCartCore(db, jar, form({ slug: "geo-riot", size: "M" }));
    const cartId = jar.get(CART_COOKIE)!;
    addToCartCore(db, jar, form({ slug: "beige-regret", size: "S" }));
    expect(jar.get(CART_COOKIE)).toBe(cartId);
    expect(getCartView(db, cartId).itemCount).toBe(2);
  });

  it("uses the signed-in user's cart and sets no guest cookie", async () => {
    const { db } = createSeededTestDb();
    const { userId } = (await signUp(db, {
      email: "u@x.io",
      password: "complicated",
      displayName: null,
    })) as { userId: number };
    const jar = new FakeCookieJar({ [SESSION_COOKIE]: createSession(db, userId).token });
    addToCartCore(db, jar, form({ slug: "geo-riot", size: "M" }));
    expect(jar.get(CART_COOKIE)).toBeUndefined();
    expect(getCartView(db, findCartId(db, { cartId: null, userId })).itemCount).toBe(1);
  });

  it("passes contract error codes through with brand-voice messages", () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    expect(addToCartCore(db, jar, form({ slug: "geo-riot" }))).toEqual({
      ok: false,
      code: "SIZE_REQUIRED",
      message: copy.codes.SIZE_REQUIRED,
    });
    expect(addToCartCore(db, jar, form({ slug: "retired-riot", size: "M" }))).toMatchObject({
      ok: false,
      code: "SHIRT_INACTIVE",
    });
  });
});

describe("updateCartItem / removeCartItem actions", () => {
  it("update and remove lines in the cookie's cart", () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    addToCartCore(db, jar, form({ slug: "geo-riot", size: "M" }));
    expect(
      updateCartItemCore(db, jar, form({ slug: "geo-riot", size: "M", quantity: "4" })),
    ).toEqual({
      ok: true,
      itemCount: 4,
    });
    expect(
      updateCartItemCore(db, jar, form({ slug: "geo-riot", size: "M", quantity: "lots" })),
    ).toMatchObject({
      ok: false,
      code: "INVALID_QUANTITY",
    });
    for (const bad of ["-2", "-0", "1.5", "100"]) {
      expect(
        updateCartItemCore(db, jar, form({ slug: "geo-riot", size: "M", quantity: bad })),
      ).toMatchObject({ ok: false, code: "INVALID_QUANTITY" });
    }
    expect(removeCartItemCore(db, jar, form({ slug: "geo-riot", size: "M" }))).toEqual({
      ok: true,
      itemCount: 0,
    });
  });

  it("report NOT_IN_CART when there is no cart at all", () => {
    const { db } = createSeededTestDb();
    const jar = new FakeCookieJar();
    expect(removeCartItemCore(db, jar, form({ slug: "geo-riot", size: "M" }))).toMatchObject({
      ok: false,
      code: "NOT_IN_CART",
    });
    expect(
      updateCartItemCore(db, jar, form({ slug: "geo-riot", size: "M", quantity: "2" })),
    ).toMatchObject({
      ok: false,
      code: "NOT_IN_CART",
    });
  });
});
