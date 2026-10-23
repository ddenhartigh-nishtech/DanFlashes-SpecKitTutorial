import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/copy";
import { CART_COOKIE, SESSION_COOKIE } from "@/lib/http/cookies";
import { handlePssb, type PssbDeps } from "@/lib/pssb/handle";
import { createSeededTestDb, setSwitches } from "../helpers/db";
import { person } from "../helpers/people";

interface Sent {
  url: string;
  body: {
    messages: { role: string; content: string }[];
    stream: boolean;
    options: { num_predict: number };
  };
}

/** A stand-in Ollama that streams `words`, and records what it was sent. */
function model(words: string[] | "refused" | "silent") {
  const sent: Sent[] = [];
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
    // The reachability probe (T031): answered, refused or ignored like the chat would be.
    if (url.endsWith("/api/version")) {
      if (words === "refused") throw new TypeError("fetch failed");
      if (words === "silent") {
        return await new Promise<Response>((_resolve, reject) =>
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          ),
        );
      }
      return new Response("{}");
    }
    sent.push({ url, body: JSON.parse(String(init.body)) });
    if (words === "refused") throw new TypeError("fetch failed");
    if (words === "silent") {
      return await new Promise<Response>((_resolve, reject) =>
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        ),
      );
    }
    const lines = [...words.map((w) => ({ message: { content: w }, done: false })), { done: true }];
    return new Response(lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, sent };
}

function request(body: unknown, cookies: Record<string, string> = {}) {
  return new Request("http://store.test/api/pssb", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("; "),
    },
    body: JSON.stringify(body),
  });
}

async function events(response: Response) {
  const text = await response.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { t: string; s?: string; html?: string; offer?: unknown });
}

const deps = (fetchImpl: typeof fetch): PssbDeps => ({ fetchImpl, env: {}, random: () => 0 });
const reply = (message: string, page = "/shirts", history: unknown[] = []) => ({
  kind: "reply",
  message,
  page,
  history,
});

afterEach(() => vi.useRealTimers());

describe("POST /api/pssb (012 R6, contracts/pssb.md)", () => {
  it("streams guarded words, then the reply with real shirts linked", async () => {
    const { db } = createSeededTestDb();
    const { fetchImpl, sent } = model([
      "Fractal Fury ",
      "is $750.00 ",
      "of glory. ",
      "Buy Geo Riot.",
    ]);
    const response = await handlePssb(db, request(reply("Is Fractal Fury good?")), deps(fetchImpl));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/x-ndjson");
    const all = await events(response);
    const text = all
      .filter((e) => e.t === "text")
      .map((e) => e.s)
      .join("");
    expect(text).not.toContain("$750.00");
    expect(text).toContain(copy.pssb.priceGuard);
    const done = all.at(-1)!;
    expect(done.t).toBe("done");
    expect(done.html).toContain('<a href="/shirts/fractal-fury">Fractal Fury</a>');
    expect(done.html).toContain('<a href="/shirts/geo-riot">Geo Riot</a>');
    expect(done.offer).toBeNull();
    expect(sent[0].url).toBe("http://localhost:11434/api/chat");
  });

  it("sends the stable facts first, the shopper second, and the page last, never a score", async () => {
    const { db } = createSeededTestDb();
    const { fetchImpl, sent } = model(["Fine."]);
    await events(await handlePssb(db, request(reply("hi", "/shirts/geo-riot")), deps(fetchImpl)));
    const [stable, shopper, ...rest] = sent[0].body.messages;
    expect(stable).toMatchObject({ role: "system" });
    expect(stable.content).toContain("SHIRTS FOR SALE");
    expect(shopper.content).toContain("a guest with no account");
    expect(rest.at(-2)).toMatchObject({ role: "system" });
    expect(rest.at(-2)!.content).toContain("He is looking at Geo Riot.");
    expect(rest.at(-1)).toEqual({ role: "user", content: "hi" });
    // He's told he doesn't know scores; no score itself is ever in what he's sent.
    expect(JSON.stringify(sent[0].body)).not.toMatch(/"complexity"|complexity[^.\\]*\d/i);
  });

  it("blanks card and SSN shapes before the model sees them (FR-016)", async () => {
    const { db } = createSeededTestDb();
    const { fetchImpl, sent } = model(["No."]);
    await events(
      await handlePssb(
        db,
        request(
          reply("my card is 4242 4242 4242 4242", "/", [
            { role: "shopper", text: "ssn 123-45-6789" },
            { role: "pssb", text: "Shirts." },
          ]),
        ),
        deps(fetchImpl),
      ),
    );
    const body = JSON.stringify(sent[0].body);
    expect(body).not.toContain("4242 4242");
    expect(body).not.toContain("123-45-6789");
    expect(body).toContain("[redacted]");
  });

  it("knows the signed-in shopper, from his session and cart cookies", async () => {
    const { db } = createSeededTestDb();
    const craig = person(db, { displayName: "Craig" });
    const { fetchImpl, sent } = model(["Craig."]);
    await events(
      await handlePssb(
        db,
        request(reply("who am I?"), {
          [SESSION_COOKIE]: craig.jar.get(SESSION_COOKIE)!,
          [CART_COOKIE]: "x",
        }),
        deps(fetchImpl),
      ),
    );
    expect(sent[0].body.messages[1].content).toContain("THE SHOPPER: Craig, signed in.");
  });

  it("offers Add it from his words, and tells PSSB so (FR-010, R3)", async () => {
    const { db } = createSeededTestDb();
    const { fetchImpl, sent } = model(["Magnificent."]);
    const all = await events(
      await handlePssb(db, request(reply("add Fractal Fury in L")), deps(fetchImpl)),
    );
    expect(all.at(-1)!.offer).toEqual({
      slug: "fractal-fury",
      name: "Fractal Fury",
      size: "L",
      priceUsd: "999.99",
    });
    expect(sent[0].body.messages.at(-2)!.content).toContain("He wants Fractal Fury in L.");
  });

  it("tells PSSB to refuse a BLAND shirt, with no offer", async () => {
    const { db } = createSeededTestDb();
    const { fetchImpl, sent } = model(["Beige? Disgusting."]);
    const all = await events(
      await handlePssb(db, request(reply("add Beige Regret in M")), deps(fetchImpl)),
    );
    expect(all.at(-1)!.offer).toBeNull();
    expect(sent[0].body.messages.at(-2)!.content).toMatch(/BLAND shirt\. Refuse/);
  });

  it("approaches with an opener instruction about the page, sulking if he closed it", async () => {
    const { db } = createSeededTestDb();
    const { fetchImpl, sent } = model(["Still browsing?"]);
    await events(
      await handlePssb(
        db,
        request({ kind: "approach", page: "/cart", history: [], closedLast: true }),
        deps(fetchImpl),
      ),
    );
    const note = sent[0].body.messages.at(-2)!.content;
    expect(note).toContain("He is on his cart.");
    expect(note).toMatch(/closed your chat window/);
  });

  it("answers a warm-up at once, and warms the model only when the prompt is new (analysis U1)", async () => {
    const { db } = createSeededTestDb();
    setSwitches(db, { supportEmail: `warm-${Date.now()}@danflashes.local` }); // a prompt no other test has warmed
    const { fetchImpl, sent } = model(["."]);
    const first = await handlePssb(
      db,
      request({ kind: "warm", page: "/", history: [] }),
      deps(fetchImpl),
    );
    expect(first.status).toBe(204);
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].body).toMatchObject({ stream: false, options: { num_predict: 1 } });
    await handlePssb(db, request({ kind: "warm", page: "/", history: [] }), deps(fetchImpl));
    expect(sent).toHaveLength(1);
  });

  it("is the store's 404 while the switch is off", async () => {
    const { db } = createSeededTestDb();
    setSwitches(db, { pushySalesBot: false });
    const { fetchImpl, sent } = model(["x"]);
    const response = await handlePssb(db, request(reply("hi")), deps(fetchImpl));
    expect(response.status).toBe(404);
    expect(sent).toHaveLength(0);
  });

  it.each([
    ["an empty message", reply("")],
    ["a 501-character message", reply("x".repeat(501))],
    [
      "seven history turns",
      reply(
        "hi",
        "/",
        Array.from({ length: 7 }, () => ({ role: "pssb", text: "x" })),
      ),
    ],
    ["a page that isn't a store path", reply("hi", "https://evil.test/")],
    ["an unknown kind", { kind: "sing", page: "/", history: [] }],
  ])("refuses %s with 400", async (_name, body) => {
    const { db } = createSeededTestDb();
    const { fetchImpl, sent } = model(["x"]);
    expect((await handlePssb(db, request(body), deps(fetchImpl))).status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("stays in character when the model is unreachable (FR-017)", async () => {
    const { db } = createSeededTestDb();
    const all = await events(
      await handlePssb(db, request(reply("hi")), deps(model("refused").fetchImpl)),
    );
    expect(all).toEqual([{ t: "canned", s: copy.pssb.unreachable, offer: null }]);
  });

  it("gives a canned excuse for Dan when the model's down and he asks about an order (FR-007)", async () => {
    const { db } = createSeededTestDb();
    const all = await events(
      await handlePssb(db, request(reply("where is my order?")), deps(model("refused").fetchImpl)),
    );
    expect(all[0].s).toBe(copy.pssb.excuses[0]);
    setSwitches(db, { supportEmail: "complaints@danflashes.local" });
    const again = await events(
      await handlePssb(db, request(reply("where is my order?")), deps(model("refused").fetchImpl)),
    );
    expect(again[0].s).toContain("complaints@danflashes.local");
  });

  it("gives a canned line within 5 s for an address that never answers (SC-004, analysis I1)", async () => {
    vi.useFakeTimers();
    const { db } = createSeededTestDb();
    const pending = handlePssb(db, request(reply("hi")), deps(model("silent").fetchImpl)).then(
      events,
    );
    await vi.advanceTimersByTimeAsync(5_001);
    expect(await pending).toEqual([{ t: "canned", s: copy.pssb.unreachable, offer: null }]);
  });

  it("logs nothing a shopper typed (FR-015)", async () => {
    const { db } = createSeededTestDb();
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    await events(
      await handlePssb(db, request(reply("secret words")), deps(model(["Shirts."]).fetchImpl)),
    );
    await events(
      await handlePssb(db, request(reply("secret words")), deps(model("refused").fetchImpl)),
    );
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain("secret words");
      spy.mockRestore();
    }
  });
});
