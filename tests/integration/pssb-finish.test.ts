import { describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy";
import { fewSentences, handlePssb, wholeSentences } from "@/lib/pssb/handle";
import { createSeededTestDb } from "../helpers/db";

/** A stand-in Ollama that says `text`, then the store's finished reply. */
async function finished(text: string, message: string) {
  const { db } = createSeededTestDb();
  const fetchImpl = vi.fn(async (url: string) =>
    url.endsWith("/api/version")
      ? new Response("{}")
      : new Response(
          [{ message: { content: text }, done: false }, { done: true }]
            .map((l) => `${JSON.stringify(l)}\n`)
            .join(""),
        ),
  ) as unknown as typeof fetch;
  const response = await handlePssb(
    db,
    new Request("http://store.test/api/pssb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "reply", message, page: "/", history: [] }),
    }),
    { fetchImpl, env: {}, random: () => 0 },
  );
  const events = (await response.text())
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { t: string; html?: string });
  return events.at(-1)!;
}

describe("wholeSentences (012 FR-002, tuned in T031)", () => {
  it("ends a reply cut off by the length cap at its last whole sentence", () => {
    expect(wholeSentences("Buy Geo Riot. It is magnificent and you are not yet")).toBe(
      "Buy Geo Riot.",
    );
    expect(wholeSentences("Buy it! Now.")).toBe("Buy it! Now.");
    expect(wholeSentences('He said "buy it."')).toBe('He said "buy it."');
    expect(wholeSentences("no punctuation at all")).toBe("no punctuation at all");
  });
});

describe("the store's push (012 FR-002, tuned in T031)", () => {
  it("ends a reply that names no shirt with a featured one, linked", async () => {
    const done = await finished("Dan is at a summit. ", "where's Dan?");
    expect(done.t).toBe("done");
    expect(done.html).toMatch(/^Dan is at a summit\. Now go look at <a href="\/shirts\/[a-z-]+">/);
  });

  it("leaves a reply that already names a shirt alone", async () => {
    const done = await finished("Buy Geo Riot. ", "what should I buy?");
    expect(done.html).toBe('Buy <a href="/shirts/geo-riot">Geo Riot</a>.');
  });
});

describe("the character guard (012 FR-001, tuned in T031)", () => {
  it("replaces a reply where the model says what it is with one in character", async () => {
    const done = await finished("I'm a large language model trained on text. ", "what are you?");
    expect(done.t).toBe("done");
    expect(done.html).not.toMatch(/language model/);
    expect(done.html).toContain("I&#39;m PSSB");
    expect(copy.pssb.inCharacter[0]).toContain("I'm PSSB");
  });
});

describe("a few sentences (012 FR-002, T037)", () => {
  it("keeps his first four sentences, then the store's push", async () => {
    const done = await finished(
      "One. Two! Three? Four. Five is too many. Six is worse. ",
      "tell me everything about Dan",
    );
    expect(done.html).toMatch(
      /^One\. Two! Three\? Four\. Now go look at <a href="\/shirts\/[a-z-]+">/,
    );
    expect(done.html).not.toContain("Five");
  });

  it("leaves a short reply alone", () => {
    expect(fewSentences("Buy Geo Riot. Now.")).toBe("Buy Geo Riot. Now.");
    expect(fewSentences('He said "buy it." So buy it.', 1)).toBe('He said "buy it."');
  });
});

describe("the designer, linked (012 FR-008, T036)", () => {
  it("links the shirt designer and the dial to the designer's page", async () => {
    const done = await finished(
      "Use the shirt designer. Turn the dial, and buy Geo Riot. ",
      "how do I design a shirt?",
    );
    expect(done.html).toBe(
      'Use the <a href="/how-complicated">shirt designer</a>. Turn <a href="/how-complicated">the dial</a>, and buy <a href="/shirts/geo-riot">Geo Riot</a>.',
    );
  });

  it("still adds the store's push when he names only the designer", async () => {
    const done = await finished("Use the shirt designer. ", "how do I design a shirt?");
    expect(done.html).toMatch(/Now go look at <a href="\/shirts\/[a-z-]+">/);
  });
});
