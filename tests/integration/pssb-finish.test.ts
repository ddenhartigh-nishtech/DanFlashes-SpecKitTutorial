import { describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy";
import { handlePssb, wholeSentences } from "@/lib/pssb/handle";
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
