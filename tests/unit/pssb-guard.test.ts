import { describe, expect, it } from "vitest";
import { copy } from "@/lib/copy";
import { dropClaims, guardStream, isClaim, linkShirts } from "@/lib/pssb/guard";

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

describe("the claim guard (012 Q8, FR-011, R3 amended)", () => {
  it.each([
    "The Geo Riot polo, in XXL, is now yours for $350.00.",
    "The Geo Riot and Dan's Masterpiece, both in XXL, will be added to your cart.",
    "I've added it to your cart.",
    "It's in your cart now.",
    "Fractal Fury is now in your cart!",
    "Done. It has been added.",
    "It’s yours.",
  ])("calls %j a claim", (sentence) => {
    expect(isClaim(sentence)).toBe(true);
  });

  it.each([
    "Shall I add it to your cart?",
    "Press Add it, before you lose your nerve.",
    "Geo Riot is already in your cart.",
    "The choice is yours.",
    "Your cart looks lonely.",
  ])("leaves %j alone", (sentence) => {
    expect(isClaim(sentence)).toBe(false);
  });

  it("drops the claims from a reply and says whether it did", () => {
    expect(
      dropClaims("Only 1 left! The Geo Riot polo is now yours. Shall I add it to your cart?"),
    ).toEqual({ text: "Only 1 left! Shall I add it to your cart?", dropped: true });
    expect(dropClaims("Buy Geo Riot. Now.")).toEqual({
      text: "Buy Geo Riot. Now.",
      dropped: false,
    });
  });
});

describe("the stream never shows a claim (012 Q8, analysis C1)", () => {
  const words = (text: string) => text.split(/(?<= )/);

  it("holds a claimed add until its sentence ends, then drops it", () => {
    const reply =
      "Only 1 left! The Geo Riot polo, in XXL, is now yours for $1,350.00. Shall I add it to your cart? ";
    const guard = guardStream(allowed);
    const shown =
      words(reply)
        .map((w) => guard.push(w))
        .join("") + guard.end();
    expect(shown).not.toMatch(/yours/);
    expect(shown).toContain("Only 1 left! ");
    expect(shown).toContain("Shall I add it to your cart? ");
    expect(guard.text()).toBe(reply);
  });

  it("drops 'will be added' even when it ends the reply with no space after", () => {
    const guard = guardStream(allowed);
    const shown =
      words("Both, in XXL, will be added to your cart.")
        .map((w) => guard.push(w))
        .join("") + guard.end();
    expect(shown).not.toMatch(/added|cart/);
  });

  it("releases a held sentence that turns out innocent", () => {
    expect(run(words("Your cart looks lonely. Fix that. "))).toBe(
      "Your cart looks lonely. Fix that. ",
    );
    expect(run(words("Geo Riot is already in your cart"))).toBe("Geo Riot is already in your cart");
  });
});
