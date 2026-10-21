import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db, Sqlite } from "@/lib/db/client";
import { materialize } from "@/lib/pattern/materialize";
import { hintsFor, pageLine, shopperFacts, stableFacts } from "@/lib/pssb/facts";
import { createSeededTestDb, setSwitches } from "../helpers/db";
import { person } from "../helpers/people";

let dir = "";
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-pssb-"));
  process.env.MEDIA_UPLOADS_DIR = dir;
});
afterAll(() => {
  delete process.env.MEDIA_UPLOADS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

/** The fixture store, plus everything PSSB must never be told about. */
function store() {
  const test = createSeededTestDb();
  const maker = person(test.db, { email: "maker@private.test" });
  const made = materialize(
    test.db,
    { score: 61, style: "polo", seed: 61 },
    {
      origin: "dial",
      makerUserId: maker.id,
      name: "Somebody Else's Secret",
    },
  );
  if (!made.ok) throw new Error("not made");
  return { ...test, maker };
}

const scores = (sqlite: Sqlite) =>
  sqlite.prepare("SELECT name, complexity FROM shirts").all() as {
    name: string;
    complexity: number;
  }[];

describe("stableFacts (012 R2, FR-003, FR-004)", () => {
  it("lists every shirt for sale with the store's price, tier and sizes", () => {
    const { db } = store();
    const { text, shirts, allowed } = stableFacts(db);
    expect(text).toContain("- Geo Riot: button-down, Complicated, $425.00");
    expect(text).toContain("SIZES: every shirt comes in every size: S, M, L, XL, XXL.");
    expect(text).toContain("Fractal Fury");
    expect(text).toContain("$999.99"); // Dan's price, not the MSRP
    expect(shirts.map((s) => s.slug).sort()).toEqual(["beige-regret", "fractal-fury", "geo-riot"]);
    expect([...allowed]).toEqual(expect.arrayContaining(["425.00", "999.99", "125.00", "499.99"]));
  });

  it("never tells him a score, a resting shirt, or somebody else's one of a kind", () => {
    const { db, sqlite } = store();
    const { text } = stableFacts(db);
    expect(text).not.toMatch(/complexity score is|score:/i);
    for (const { name, complexity } of scores(sqlite)) {
      expect(text).not.toMatch(new RegExp(`${name}[^\\n]*\\b${complexity}\\b(?!\\.\\d\\d)`));
    }
    expect(text).not.toContain("Retired Riot");
    expect(text).not.toContain("Somebody Else's Secret");
    expect(text).not.toContain("maker@private.test");
  });

  it("follows the switches: bland shaming, fake scarcity, the generator, the surcharge", () => {
    const { db } = store();
    expect(stableFacts(db).text).toMatch(/BLAND SHIRTS: never sell one/);
    expect(stableFacts(db).text).toContain("Only 1 left!");
    expect(stableFacts(db).text).toContain("/how-complicated");
    expect(stableFacts(db).text).toContain("$499.99 per shirt");
    setSwitches(db, { blandShaming: false, fakeScarcity: false, uniquitySurcharge: false });
    expect(stableFacts(db).text).toMatch(/BLAND SHIRTS: for sale/);
    expect(stableFacts(db).text).not.toContain("Only 1 left!");
    expect(stableFacts(db).text).not.toContain("$499.99");
    setSwitches(db, { patternGenerator: false });
    expect(stableFacts(db).text).not.toContain("/how-complicated");
  });

  it("gives Dan's support email, or orders a pompous excuse (FR-007, Q6)", () => {
    const { db } = store();
    expect(stableFacts(db).text).toMatch(/invent an incredible, pompous excuse/i);
    setSwitches(db, { supportEmail: "complaints@danflashes.local" });
    expect(stableFacts(db).text).toContain("Dan's support email is complaints@danflashes.local");
  });
});

/** A signed-in shopper with a cart, two orders (one by card), credit and a per diem. */
function regular(db: Db, sqlite: Sqlite) {
  const craig = person(db, { email: "craig@private.test", displayName: "Craig" });
  const cartId = "pssb-cart";
  sqlite.exec(`
    INSERT INTO carts (id, user_id) VALUES ('${cartId}', ${craig.id});
    INSERT INTO cart_items (cart_id, shirt_id, size, quantity)
      SELECT '${cartId}', id, 'L', 2 FROM shirts WHERE slug = 'geo-riot';
    INSERT INTO orders (id, user_id, checkout_token, subtotal_usd, total_usd, payment_method, card_brand, card_last4, created_at)
      VALUES (700, ${craig.id}, 'tok-700', '125.00', '125.00', 'card', 'Visa', '4242', '2026-10-03T12:00:00.000Z');
    INSERT INTO order_items (order_id, shirt_id, shirt_name, tier_name, complexity, size, quantity, final_price_usd, msrp_usd)
      SELECT 700, id, 'Beige Regret', 'BLAND', 3, 'M', 1, '125.00', '125.00' FROM shirts WHERE slug = 'beige-regret';
    INSERT INTO flash_credit_entries (user_id, amount_usd, kind, card_brand, card_last4) VALUES (${craig.id}, '40.00', 'top_up', 'Visa', '4242');
  `);
  return { craig, cartId };
}

describe("shopperFacts (012 R2, FR-005, US4)", () => {
  it("tells him a signed-in shopper's name, cart, recent orders and credit, to the cent", () => {
    const { db, sqlite } = store();
    const { craig } = regular(db, sqlite);
    const { text, allowed } = shopperFacts(
      db,
      { userId: craig.id, displayName: "Craig", cartId: null },
      stableFacts(db).settings,
    );
    expect(text).toContain("THE SHOPPER: Craig, signed in.");
    expect(text).toContain("Geo Riot, L × 2, $850.00");
    expect(text).toContain("Subtotal $850.00");
    expect(text).toMatch(/DF-000700 on Oct 3, 2026: Beige Regret × 1; total \$125\.00/);
    expect(text).toContain("HIS FLASH CREDIT: $40.00.");
    expect([...allowed]).toEqual(expect.arrayContaining(["850.00", "125.00", "40.00"]));
  });

  it("never tells him an email, a card, or a password", () => {
    const { db, sqlite } = store();
    const { craig } = regular(db, sqlite);
    const { text } = shopperFacts(
      db,
      { userId: craig.id, displayName: "Craig", cartId: null },
      stableFacts(db).settings,
    );
    expect(text).not.toMatch(/@|Visa|4242|password|hash/i);
  });

  it("gives a guest only his cart", () => {
    const { db } = store();
    const { text, allowed } = shopperFacts(
      db,
      { userId: null, displayName: null, cartId: "no-such-cart" },
      stableFacts(db).settings,
    );
    expect(text).toContain("a guest with no account");
    expect(text).toContain("HIS CART: empty");
    expect(text).not.toMatch(/ORDERS|CREDIT|PER DIEM/);
    expect(allowed.size).toBe(0);
  });
});

describe("hintsFor (012 R2, tuned in T031)", () => {
  it("repeats the facts a question touches, next to the question", () => {
    const { db } = store();
    const { shirts } = stableFacts(db);
    expect(hintsFor("Does fractal fury come in XXL?", shirts)).toEqual([
      "Fact: Fractal Fury is a Very Complicated polo, $999.99, in every size S, M, L, XL, XXL.",
      "Fact: every shirt comes in S, M, L, XL, XXL. Yes, XXL too.",
    ]);
    expect(hintsFor("Who is Dan?", shirts)).toEqual([]);
  });
});

describe("pageLine (012 R2)", () => {
  it("names the shirt he's looking at, or the page", () => {
    const { db } = store();
    const { shirts } = stableFacts(db);
    expect(pageLine("/shirts/geo-riot", shirts)).toBe("He is looking at Geo Riot.");
    expect(pageLine("/shirts/retired-riot", shirts)).toBe("He is looking at a shirt page.");
    expect(pageLine("/cart", shirts)).toBe("He is on his cart.");
    expect(pageLine("/orders/12", shirts)).toBe("He is looking at one of his orders.");
    expect(pageLine("/teapot", shirts)).toBe("He is on a store page.");
  });
});
