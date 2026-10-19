import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeItMineCore } from "@/lib/actions/dial";
import { addItem, getCartView, getOrCreateCart } from "@/lib/cart/cart";
import { placeOrder } from "@/lib/checkout/place-order";
import { copy } from "@/lib/copy";
import { getShirtBySlug } from "@/lib/data/shirts";
import { topUp } from "@/lib/flash-credit/ledger";
import { getOrderForUser } from "@/lib/orders/orders";
import { buildDial } from "@/lib/pattern/dial-view";
import { encodeRecipe } from "@/lib/pattern/recipe";
import { form } from "../helpers/cookies";
import { createSeededTestDb, setSwitches } from "../helpers/db";
import { person } from "../helpers/people";

let dir = "";
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-mine-"));
  process.env.MEDIA_UPLOADS_DIR = dir;
});
afterAll(() => {
  delete process.env.MEDIA_UPLOADS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

const CARD = { number: "4242424242424242", expiry: "12/39", cvc: "123" };
const NOW = new Date("2026-10-19T12:00:00.000Z");
const codeAt = (db: Parameters<typeof buildDial>[0], step: number) =>
  buildDial(db, {})!.steps[step].code!;

describe("Make it mine (007 FR-014, FR-015)", () => {
  it("makes the setting a real shirt and says where it lives", () => {
    const { db } = createSeededTestDb();
    const state = makeItMineCore(db, form({ code: codeAt(db, 40) }));
    expect(state).toMatchObject({ ok: true, slug: expect.stringMatching(/^[a-z-]+$/) });
    if (!state.ok) return;
    expect(getShirtBySlug(db, state.slug)).toMatchObject({ status: "active" });
  });

  it("lands on the same shirt every time", () => {
    const { db } = createSeededTestDb();
    const code = codeAt(db, 40);
    const a = makeItMineCore(db, form({ code }));
    const b = makeItMineCore(db, form({ code }));
    expect(a.ok && b.ok && a.slug === b.slug).toBe(true);
  });

  it.each([
    ["while the generator is off", true, (db: Parameters<typeof codeAt>[0]) => codeAt(db, 40)],
    ["for a code that isn't one", false, () => "nothing-here"],
    ["beyond the top", false, () => encodeRecipe({ score: 900_000, style: "polo", seed: 1 })],
  ])("refuses %s", (_name, off, code) => {
    const { db } = createSeededTestDb();
    const c = code(db);
    if (off) setSwitches(db, { patternGenerator: false });
    expect(makeItMineCore(db, form({ code: c }))).toEqual({
      ok: false,
      message: copy.dial.refused,
    });
  });

  it("makes the BLAND end a BLAND shirt, whose page runs the shaming loop (FR-017)", () => {
    const { db } = createSeededTestDb();
    const state = makeItMineCore(db, form({ code: codeAt(db, 0) }));
    if (!state.ok) throw new Error("not made");
    expect(getShirtBySlug(db, state.slug)!.tier.isBland).toBe(true);
  });

  it("lands on the shirt the owner rested, now retired (analysis U1)", () => {
    const { db, sqlite } = createSeededTestDb();
    const code = codeAt(db, 40);
    const first = makeItMineCore(db, form({ code }));
    if (!first.ok) throw new Error("not made");
    sqlite.prepare("UPDATE shirts SET status = 'inactive' WHERE slug = ?").run(first.slug);
    const again = makeItMineCore(db, form({ code }));
    expect(again).toMatchObject({ ok: true, slug: first.slug });
    expect(getShirtBySlug(db, first.slug)?.status).toBe("inactive");
  });
});

describe("a generated shirt is bought like any other (007 FR-016, analysis G1)", () => {
  function shopperWithIt(balance: string) {
    const test = createSeededTestDb();
    const state = makeItMineCore(test.db, form({ code: codeAt(test.db, 40) }));
    if (!state.ok) throw new Error("not made");
    const userId = person(test.db).id;
    topUp(test.db, userId, { amountInput: balance, card: CARD, now: NOW });
    const cartId = getOrCreateCart(test.db, { cartId: null, userId }).id;
    expect(addItem(test.db, cartId, { slug: state.slug, size: "XL" }).ok).toBe(true);
    const total = getCartView(test.db, cartId).subtotalUsd;
    return { ...test, userId, total, slug: state.slug };
  }

  it("by Flash Credit", () => {
    const { db, userId, total, slug } = shopperWithIt("1000000.00");
    const order = placeOrder(db, {
      userId,
      cartId: null,
      checkoutToken: "gen-credit",
      expectedTotalUsd: total,
      useFlashCredit: true,
      expectedCreditUsd: total,
      now: NOW,
    });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    expect(getOrderForUser(db, order.orderId, userId)!.lines[0]).toMatchObject({ slug });
  });

  it("by Flash Credit and a card together", () => {
    const { db, userId, total, slug } = shopperWithIt("10.00");
    const order = placeOrder(db, {
      userId,
      cartId: null,
      checkoutToken: "gen-split",
      expectedTotalUsd: total,
      useFlashCredit: true,
      expectedCreditUsd: "10.00",
      confirmSplit: true,
      card: CARD,
      now: NOW,
    });
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    const view = getOrderForUser(db, order.orderId, userId)!;
    expect(view.lines[0]).toMatchObject({ slug });
    expect(view.payment).toMatchObject({ method: "split", creditUsd: "10.00" });
  });
});
