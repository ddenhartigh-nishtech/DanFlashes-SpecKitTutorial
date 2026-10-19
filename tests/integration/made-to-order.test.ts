import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setShirtListedCore } from "@/lib/actions/admin/generator";
import { makeItMineCore } from "@/lib/actions/dial";
import { addItem, getCartView, getOrCreateCart, mergeGuestCart, updateItem } from "@/lib/cart/cart";
import { canBuy, isOneOfAKind } from "@/lib/catalog/one-of-a-kind";
import { placeOrder } from "@/lib/checkout/place-order";
import { getShirtBySlug } from "@/lib/data/shirts";
import type { Db, Sqlite } from "@/lib/db/client";
import { buildDial } from "@/lib/pattern/dial-view";
import { materialize } from "@/lib/pattern/materialize";
import { decodeRecipe } from "@/lib/pattern/recipe";
import { form } from "../helpers/cookies";
import { createSeededTestDb, setSwitches } from "../helpers/db";
import { person } from "../helpers/people";

let dir = "";
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-made-"));
  process.env.MEDIA_UPLOADS_DIR = dir;
});
afterAll(() => {
  delete process.env.MEDIA_UPLOADS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

const CARD = { number: "4242424242424242", expiry: "12/39", cvc: "123" };
const codeAt = (db: Db, step: number) => buildDial(db, {})!.steps[step].code!;
const makerOf = (sqlite: Sqlite, slug: string) =>
  (
    sqlite.prepare("SELECT maker_user_id FROM shirts WHERE slug = ?").get(slug) as {
      maker_user_id: number | null;
    }
  ).maker_user_id;

/** A shirt the maker made at the dial, and someone else with his own cart. */
function madeShirt() {
  const test = createSeededTestDb();
  const maker = person(test.db);
  const other = person(test.db);
  const made = makeItMineCore(test.db, form({ code: codeAt(test.db, 40) }), maker.id);
  if (!made.ok || !("slug" in made)) throw new Error("not made");
  const cartOf = (userId: number | null) => getOrCreateCart(test.db, { cartId: null, userId }).id;
  return { ...test, maker, other, slug: made.slug, cartOf };
}

describe("Make it mine needs an account, and makes the shirt his (007 FR-014, R14)", () => {
  it("sends a guest to sign in, back to the same setting, and makes nothing", () => {
    const { db, sqlite } = createSeededTestDb();
    const code = codeAt(db, 40);
    const before = sqlite.prepare("SELECT COUNT(*) AS n FROM shirts").get();
    expect(makeItMineCore(db, form({ code }), null)).toEqual({
      ok: false,
      signIn: `/how-complicated?r=${code}`,
    });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM shirts").get()).toEqual(before);
  });

  it("records the shopper who pressed it as the maker", () => {
    const { sqlite, maker, slug } = madeShirt();
    expect(makerOf(sqlite, slug)).toBe(maker.id);
  });

  it("lets the next shopper claim a made shirt nobody owns, and leaves someone else's alone", () => {
    const { db, sqlite } = createSeededTestDb();
    const code = codeAt(db, 40);
    const orphan = materialize(db, decodeRecipe(code)!, { origin: "dial" });
    if (!orphan.ok) throw new Error("not made");
    const first = person(db);
    const second = person(db);
    expect(makeItMineCore(db, form({ code }), first.id)).toEqual({ ok: true, slug: orphan.slug });
    expect(makerOf(sqlite, orphan.slug)).toBe(first.id);
    expect(makeItMineCore(db, form({ code }), second.id)).toEqual({ ok: true, slug: orphan.slug });
    expect(makerOf(sqlite, orphan.slug)).toBe(first.id);
  });
});

describe("only its maker can buy a one-of-a-kind shirt (007 FR-018, SC-009)", () => {
  it("knows what's one of a kind, and who can buy it", () => {
    const dial = { origin: "dial" as const, listed: false, makerUserId: 7 };
    expect(isOneOfAKind(dial)).toBe(true);
    expect(canBuy(dial, 7)).toBe(true);
    expect([canBuy(dial, 8), canBuy(dial, null)]).toEqual([false, false]);
    expect(canBuy({ ...dial, listed: true }, null)).toBe(true);
    expect(canBuy({ origin: "owner", listed: true, makerUserId: null }, null)).toBe(true);
    expect(canBuy({ origin: "catalog", listed: true, makerUserId: null }, 8)).toBe(true);
  });

  it("lets the maker add as many as he likes", () => {
    const { db, maker, slug, cartOf } = madeShirt();
    const cart = cartOf(maker.id);
    expect(addItem(db, cart, { slug, size: "L" }).ok).toBe(true);
    expect(updateItem(db, cart, { slug, size: "L", quantity: 5 }).ok).toBe(true);
    expect(getCartView(db, cart).lines[0]).toMatchObject({ quantity: 5 });
  });

  it("refuses anyone else's add, and a guest's", () => {
    const { db, other, slug, cartOf } = madeShirt();
    expect(addItem(db, cartOf(other.id), { slug, size: "L" })).toEqual({
      ok: false,
      code: "NOT_YOURS",
    });
    expect(addItem(db, cartOf(null), { slug, size: "L" })).toEqual({
      ok: false,
      code: "NOT_YOURS",
    });
  });

  it("pulls it from someone else's cart once Dan makes it one of a kind again, and stops a raise", () => {
    const { db, maker, other, slug, cartOf } = madeShirt();
    const dan = person(db, { admin: true });
    const shirtId = String(getShirtBySlug(db, slug)!.id);
    setShirtListedCore(db, dan.jar, form({ id: shirtId, listed: "1" }));
    const theirs = cartOf(other.id);
    const mine = cartOf(maker.id);
    expect(addItem(db, theirs, { slug, size: "M" }).ok).toBe(true);
    expect(addItem(db, mine, { slug, size: "M" }).ok).toBe(true);
    setShirtListedCore(db, dan.jar, form({ id: shirtId, listed: "0" }));

    expect(updateItem(db, theirs, { slug, size: "M", quantity: 2 })).toEqual({
      ok: false,
      code: "NOT_YOURS",
    });
    const view = getCartView(db, theirs);
    expect(view.lines).toEqual([]);
    expect(view.removed).toEqual([expect.objectContaining({ slug, reason: "unique" })]);
    expect(getCartView(db, mine).lines).toHaveLength(1);
  });

  it("drops it at a sign-in merge into someone else's cart, and keeps it for the maker", () => {
    const { db, maker, other, slug, cartOf } = madeShirt();
    const dan = person(db, { admin: true });
    const shirtId = String(getShirtBySlug(db, slug)!.id);
    setShirtListedCore(db, dan.jar, form({ id: shirtId, listed: "1" }));
    const guestOne = cartOf(null);
    const guestTwo = getOrCreateCart(db, { cartId: null, userId: null }).id;
    addItem(db, guestOne, { slug, size: "S" });
    addItem(db, guestTwo, { slug, size: "S" });
    setShirtListedCore(db, dan.jar, form({ id: shirtId, listed: "0" }));

    mergeGuestCart(db, guestOne, other.id);
    mergeGuestCart(db, guestTwo, maker.id);
    expect(getCartView(db, cartOf(other.id)).lines).toEqual([]);
    expect(getCartView(db, cartOf(maker.id)).lines).toHaveLength(1);
  });

  it("refuses a checkout that holds someone else's, and places the maker's", () => {
    const { db, maker, other, slug, cartOf } = madeShirt();
    const dan = person(db, { admin: true });
    const shirtId = String(getShirtBySlug(db, slug)!.id);
    setShirtListedCore(db, dan.jar, form({ id: shirtId, listed: "1" }));
    addItem(db, cartOf(other.id), { slug, size: "XL" });
    // What his checkout showed, taken before Dan's change (a cart view would audit the line out).
    const theirsTotal = getCartView(db, cartOf(other.id)).subtotalUsd;
    setShirtListedCore(db, dan.jar, form({ id: shirtId, listed: "0" }));
    expect(
      placeOrder(db, {
        userId: other.id,
        cartId: null,
        checkoutToken: "theirs",
        expectedTotalUsd: theirsTotal,
        useFlashCredit: false,
        card: CARD,
      }),
    ).toMatchObject({ ok: false, code: "CART_AUDITED" });

    // The surcharge has its own tests (uniquity-surcharge.test.ts); this one is about who.
    setSwitches(db, { uniquitySurcharge: false });
    addItem(db, cartOf(maker.id), { slug, size: "XL" });
    const view = getCartView(db, cartOf(maker.id));
    const order = placeOrder(db, {
      userId: maker.id,
      cartId: null,
      checkoutToken: "mine",
      expectedTotalUsd: view.subtotalUsd,
      useFlashCredit: false,
      card: CARD,
    });
    expect(order.ok).toBe(true);
  });

  it("is anyone's once it's mass-produced", () => {
    const { db, other, slug, cartOf } = madeShirt();
    const dan = person(db, { admin: true });
    setShirtListedCore(
      db,
      dan.jar,
      form({ id: String(getShirtBySlug(db, slug)!.id), listed: "1" }),
    );
    expect(addItem(db, cartOf(other.id), { slug, size: "L" }).ok).toBe(true);
    expect(addItem(db, cartOf(null), { slug, size: "L" }).ok).toBe(true);
  });
});

describe("the dial knows whose a made setting is (007 R14)", () => {
  it("says it's his for its maker, and not for anyone else", () => {
    const { db, maker, other } = madeShirt();
    expect(buildDial(db, {}, maker.id)!.steps[40].made).toMatchObject({ mine: true });
    expect(buildDial(db, {}, other.id)!.steps[40].made).toMatchObject({ mine: false });
    expect(buildDial(db, {}, null)!.steps[40].made).toMatchObject({ mine: false });
  });
});
