import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getShirtBySlug } from "@/lib/data/shirts";
import type { Db } from "@/lib/db/client";
import { materialize } from "@/lib/pattern/materialize";
import { detectOffer } from "@/lib/pssb/offer";
import { createSeededTestDb, setSwitches } from "../helpers/db";
import { person } from "../helpers/people";

let dir = "";
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-offer-"));
  process.env.MEDIA_UPLOADS_DIR = dir;
});
afterAll(() => {
  delete process.env.MEDIA_UPLOADS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

/** The fixture store, plus a one-of-a-kind shirt for each of two shoppers. */
function store() {
  const test = createSeededTestDb();
  const me = person(test.db);
  const them = person(test.db);
  const mine = made(test.db, 62, me.id, "My Own Creation");
  const theirs = made(test.db, 63, them.id, "Their Creation");
  return { ...test, me: me.id, mine, theirs };
}

function made(db: Db, score: number, maker: number, name: string) {
  const result = materialize(
    db,
    { score, style: "polo", seed: score },
    { origin: "dial", makerUserId: maker, name },
  );
  if (!result.ok) throw new Error("not made");
  return getShirtBySlug(db, result.slug)!;
}

const offer = (slug: string, name: string, size: string, priceUsd: string) => ({
  kind: "offer",
  offer: { slug, name, size, priceUsd },
});

describe("detectOffer (012 FR-010, FR-011, R3)", () => {
  it.each([
    ["add Fractal Fury in XL", "/shirts", "XL"],
    ["Buy the fractal fury, size medium", "/", "M"],
    ["put Fractal Fury in my cart, large", "/cart", "L"],
    ["I'll take Fractal Fury in an extra large", "/shirts", "XL"],
    ["get me fractal fury, 2xl", "/shirts", "XXL"],
    ["add fractal fury small", "/shirts", "S"],
  ])("offers on %j", (message, page, size) => {
    const { db, me } = store();
    expect(detectOffer(db, message, [], page, me)).toEqual(
      offer("fractal-fury", "Fractal Fury", size, "999.99"),
    );
  });

  it("takes 'it' or 'this' to mean the shirt on the page", () => {
    const { db, me } = store();
    expect(detectOffer(db, "I'll take it, large", [], "/shirts/geo-riot", me)).toEqual(
      offer("geo-riot", "Geo Riot", "L", "425.00"),
    );
    expect(detectOffer(db, "add this one in M", [], "/shirts/geo-riot", me)).toEqual(
      offer("geo-riot", "Geo Riot", "M", "425.00"),
    );
  });

  it("asks for a size when he names none", () => {
    const { db, me } = store();
    expect(detectOffer(db, "put the Geo Riot in my cart", [], "/", me)).toEqual({
      kind: "tell",
      tell: "ask-size",
    });
  });

  it("doesn't mistake 'I'm' or 'Dan's' for a size", () => {
    const { db, me } = store();
    expect(detectOffer(db, "I'm going to buy Geo Riot", [], "/", me)).toEqual({
      kind: "tell",
      tell: "ask-size",
    });
  });

  it("refuses BLAND while bland shaming is on, and offers it when it's off", () => {
    const { db, me } = store();
    expect(detectOffer(db, "add Beige Regret in M", [], "/", me)).toEqual({
      kind: "tell",
      tell: "refuse-bland",
    });
    setSwitches(db, { blandShaming: false });
    expect(detectOffer(db, "add Beige Regret in M", [], "/", me)).toEqual(
      offer("beige-regret", "Beige Regret", "M", "125.00"),
    );
  });

  it("refuses a resting shirt, somebody else's one of a kind, and a size that doesn't exist", () => {
    const { db, me, theirs } = store();
    const unavailable = { kind: "tell", tell: "unavailable" };
    expect(detectOffer(db, "add Retired Riot in L", [], "/", me)).toEqual(unavailable);
    expect(detectOffer(db, `add ${theirs.name} in L`, [], "/", me)).toEqual(unavailable);
    expect(detectOffer(db, "I'll take it in L", [], `/shirts/${theirs.slug}`, me)).toEqual(
      unavailable,
    );
    expect(detectOffer(db, "add Fractal Fury in XXXL", [], "/", me)).toEqual(unavailable);
  });

  it("offers his own one of a kind, at its current price", () => {
    const { db, me, mine } = store();
    expect(detectOffer(db, `add ${mine.name} in XL`, [], "/", me)).toEqual(
      offer(mine.slug, mine.name, "XL", mine.finalPriceUsd),
    );
    expect(detectOffer(db, `add ${mine.name} in XL`, [], "/", null)).toEqual({
      kind: "tell",
      tell: "unavailable",
    });
  });

  it("uses the store's current price, Dan's or the MSRP", () => {
    const { db, sqlite, me } = store();
    sqlite.prepare("UPDATE shirts SET final_price_usd = '777.00' WHERE slug = 'geo-riot'").run();
    expect(detectOffer(db, "add Geo Riot in L", [], "/", me)).toEqual(
      offer("geo-riot", "Geo Riot", "L", "777.00"),
    );
  });

  it("offers nothing without buying words, or without a shirt", () => {
    const { db, me } = store();
    expect(detectOffer(db, "what about Fractal Fury in XL?", [], "/", me)).toEqual({
      kind: "none",
    });
    expect(detectOffer(db, "add something nice in L", [], "/shirts", me)).toEqual({ kind: "none" });
  });
});

describe("detectOffer across his recent messages (012 Q7, R3 amended 2026-11-11)", () => {
  const askSize = { kind: "tell", tell: "ask-size" };
  const none = { kind: "none" };

  it("completes the owner's chat: the size in a follow-up, then a yes", () => {
    const { db, me } = store();
    const geoXxl = offer("geo-riot", "Geo Riot", "XXL", "425.00");
    expect(detectOffer(db, "Add geo riot to my cart", [], "/", me)).toEqual(askSize);
    expect(detectOffer(db, "XXL please", ["Add geo riot to my cart"], "/", me)).toEqual(geoXxl);
    expect(detectOffer(db, "yes", ["Add geo riot to my cart", "XXL please"], "/", me)).toEqual(
      geoXxl,
    );
  });

  it("takes the shirt from a follow-up when the buying words came first", () => {
    const { db, me } = store();
    expect(detectOffer(db, "Fractal Fury in L", ["I want to buy a shirt"], "/", me)).toEqual(
      offer("fractal-fury", "Fractal Fury", "L", "999.99"),
    );
  });

  it("remembers 'it' on a shirt page", () => {
    const { db, me } = store();
    expect(detectOffer(db, "M", ["add it"], "/shirts/geo-riot", me)).toEqual(
      offer("geo-riot", "Geo Riot", "M", "425.00"),
    );
  });

  it("asks again when he switches shirts: the size was for the other one", () => {
    const { db, me } = store();
    expect(detectOffer(db, "actually, Fractal Fury", ["add Geo Riot in L"], "/", me)).toEqual(
      askSize,
    );
  });

  it("offers nothing when the new message adds nothing", () => {
    const { db, me } = store();
    expect(detectOffer(db, "who's Dan?", ["add Geo Riot in L"], "/", me)).toEqual(none);
    expect(detectOffer(db, "please tell me about Dan", ["add Geo Riot in L"], "/", me)).toEqual(
      none,
    );
  });

  it("looks back only 2 messages", () => {
    const { db, me } = store();
    expect(detectOffer(db, "XXL", ["add Geo Riot", "nice weather", "who's Dan?"], "/", me)).toEqual(
      none,
    );
  });

  it("needs an earlier shirt and size for a yes", () => {
    const { db, me } = store();
    expect(detectOffer(db, "yes", [], "/", me)).toEqual(none);
    expect(detectOffer(db, "yes", ["add Geo Riot"], "/", me)).toEqual(askSize);
  });

  it("never reads 'do it' as the shirt on the page (analysis U1)", () => {
    const { db, me } = store();
    expect(
      detectOffer(db, "do it", ["I want to buy a shirt in L"], "/shirts/geo-riot", me),
    ).toEqual(none);
  });

  it("knows a yes from a filler (analysis U2)", () => {
    const { db, me } = store();
    const earlier = ["add Geo Riot", "L"];
    const geoL = offer("geo-riot", "Geo Riot", "L", "425.00");
    expect(detectOffer(db, "yes please", earlier, "/", me)).toEqual(geoL);
    expect(detectOffer(db, "Sure, do it!", earlier, "/", me)).toEqual(geoL);
    expect(detectOffer(db, "please", earlier, "/", me)).toEqual(none);
  });

  it("still refuses across messages", () => {
    const { db, me, theirs } = store();
    const unavailable = { kind: "tell", tell: "unavailable" };
    expect(detectOffer(db, "M", ["add Beige Regret"], "/", me)).toEqual({
      kind: "tell",
      tell: "refuse-bland",
    });
    expect(detectOffer(db, "L", ["add Retired Riot"], "/", me)).toEqual(unavailable);
    expect(detectOffer(db, "L", [`add ${theirs.name}`], "/", me)).toEqual(unavailable);
    expect(detectOffer(db, "XXXL", ["add Geo Riot"], "/", me)).toEqual(unavailable);
  });

  it("never counts PSSB's words: only the shopper's are passed in", () => {
    const { db, me } = store();
    // handle.ts passes only his turns; a bare "yes" with nothing of his own offers nothing.
    expect(detectOffer(db, "yes", [], "/", me)).toEqual(none);
  });
});
