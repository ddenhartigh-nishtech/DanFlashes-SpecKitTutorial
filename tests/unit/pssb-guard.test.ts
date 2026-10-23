import { describe, expect, it } from "vitest";
import { copy } from "@/lib/copy";
import { guardStream, linkShirts } from "@/lib/pssb/guard";

const allowed = new Set(["1350.00", "499.99", "40.00"]);
const run = (chunks: string[]) => {
  const guard = guardStream(allowed);
  return chunks.map((c) => guard.push(c)).join("") + guard.end();
};

describe("guardStream (012 FR-009, R4)", () => {
  it("passes amounts the store gave him, written the store's way", () => {
    expect(run(["It's $1350.00, ", "and $1,350 is a steal."])).toBe(
      "It's $1,350.00, and $1,350.00 is a steal.",
    );
    expect(run(["You have $40.00 left."])).toBe("You have $40.00 left.");
    expect(run(["At $1,350, and $40, you're set."])).toBe("At $1,350.00, and $40.00, you're set.");
  });

  it("never shows an amount the store didn't give him", () => {
    expect(run(["Only $750.00! Buy it."])).toBe(`Only ${copy.pssb.priceGuard}! Buy it.`);
    expect(run(["20% off? No."])).toBe("20% off? No.");
  });

  it("holds a dollar amount split across chunks until it's whole", () => {
    const guard = guardStream(allowed);
    expect(guard.push("Just $1,3")).toBe("Just ");
    expect(guard.push("50.00 for you")).toBe("$1,350.00 for ");
    expect(guard.end()).toBe("you");
  });

  it("collects the amounts it refused, for the eval", () => {
    const guard = guardStream(allowed);
    guard.push("$9.99 and $1,350.00 ");
    guard.end();
    expect(guard.refused).toEqual(["9.99"]);
  });
});

const shirts = [
  { name: "Fractal Fury", slug: "fractal-fury" },
  { name: "Dan's Masterpiece", slug: "dans-masterpiece" },
  { name: "Geo Riot", slug: "geo-riot" },
];

describe("linkShirts (012 FR-009, R4)", () => {
  it("links whole shirt names the store sells, as written", () => {
    const { html, linked } = linkShirts("Buy fractal fury, or Dan's Masterpiece.", shirts);
    expect(html).toBe(
      'Buy <a href="/shirts/fractal-fury">fractal fury</a>, or <a href="/shirts/dans-masterpiece">Dan&#39;s Masterpiece</a>.',
    );
    expect(linked).toEqual(["fractal-fury", "dans-masterpiece"]);
  });

  it("leaves partial and unknown names alone, and escapes everything else", () => {
    expect(linkShirts("The Fury? Geo Riots? Paisley Panic <b>now</b>", shirts).html).toBe(
      "The Fury? Geo Riots? Paisley Panic &lt;b&gt;now&lt;/b&gt;",
    );
  });
});
