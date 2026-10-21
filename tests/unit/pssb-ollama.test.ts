import { afterEach, describe, expect, it, vi } from "vitest";
import { PssbTimeout, PssbUnreachable, streamChat, warm } from "@/lib/pssb/ollama";

const endpoint = { url: "http://model.test", model: "llama3.2:3b" };
const messages = [{ role: "user" as const, content: "hi" }];

/** A stand-in Ollama: NDJSON lines, each sent after its delay (ms). */
function ollama(lines: { at: number; json: object }[], headersAfter = 0) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    const signal = init.signal!;
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, headersAfter);
      signal.addEventListener("abort", () => {
        clearTimeout(t);
        reject(new DOMException("aborted", "AbortError"));
      });
    });
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        signal.addEventListener("abort", () =>
          controller.error(new DOMException("aborted", "AbortError")),
        );
        for (const { at, json } of lines) {
          setTimeout(() => {
            try {
              controller.enqueue(encoder.encode(`${JSON.stringify(json)}\n`));
              if ((json as { done?: boolean }).done) controller.close();
            } catch {
              // already errored by an abort
            }
          }, at);
        }
      },
    });
    return new Response(body, { status: 200 });
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}

const word = (s: string, at: number) => ({ at, json: { message: { content: s }, done: false } });
const done = (at: number) => ({ at, json: { done: true } });

async function collect(gen: AsyncGenerator<string>) {
  const out: string[] = [];
  for await (const chunk of gen) out.push(chunk);
  return out;
}

afterEach(() => vi.useRealTimers());

describe("streamChat (012 R6)", () => {
  it("streams the words in order, asking Ollama for a short, cached, streamed reply", async () => {
    const { fetchImpl, calls } = ollama([word("Two? ", 5), word("Timid.", 10), done(15)]);
    expect(await collect(streamChat(endpoint, messages, { fetchImpl }))).toEqual([
      "Two? ",
      "Timid.",
    ]);
    expect(calls[0].url).toBe("http://model.test/api/chat");
    expect(calls[0].body).toMatchObject({
      model: "llama3.2:3b",
      stream: true,
      keep_alive: "2h",
      options: { num_predict: 90, num_ctx: 4096, temperature: 0.8 },
    });
  });

  it("calls a model that doesn't answer within 5 s unreachable (analysis I1)", async () => {
    vi.useFakeTimers();
    const { fetchImpl } = ollama([word("late", 0), done(1)], 60_000);
    const result = collect(streamChat(endpoint, messages, { fetchImpl })).catch((e) => e);
    await vi.advanceTimersByTimeAsync(5_001);
    expect(await result).toBeInstanceOf(PssbUnreachable);
  });

  it("gives up with no first words in 20 s", async () => {
    vi.useFakeTimers();
    const { fetchImpl } = ollama([word("finally", 25_000), done(25_001)]);
    const result = collect(streamChat(endpoint, messages, { fetchImpl })).catch((e) => e);
    await vi.advanceTimersByTimeAsync(20_001);
    expect(await result).toBeInstanceOf(PssbTimeout);
  });

  it("gives up past 45 s in all", async () => {
    vi.useFakeTimers();
    const lines = Array.from({ length: 60 }, (_, i) => word("blah ", 1_000 * (i + 1)));
    const { fetchImpl } = ollama([...lines, done(61_000)]);
    const result = collect(streamChat(endpoint, messages, { fetchImpl })).catch((e) => e);
    await vi.advanceTimersByTimeAsync(45_001);
    expect(await result).toBeInstanceOf(PssbTimeout);
  });

  it("calls a refused connection or an error status unreachable", async () => {
    const refused = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(
      collect(streamChat(endpoint, messages, { fetchImpl: refused })),
    ).rejects.toBeInstanceOf(PssbUnreachable);
    const missing = vi.fn(
      async () => new Response("model not found", { status: 404 }),
    ) as unknown as typeof fetch;
    await expect(
      collect(streamChat(endpoint, messages, { fetchImpl: missing })),
    ).rejects.toBeInstanceOf(PssbUnreachable);
  });
});

describe("warm (012 R6, analysis U1)", () => {
  it("asks for one token, and never throws", async () => {
    const { fetchImpl, calls } = ollama([word("hi", 1), done(2)]);
    await warm(endpoint, "SYSTEM", { fetchImpl });
    expect(calls[0].body).toMatchObject({
      stream: false,
      keep_alive: "2h",
      options: { num_predict: 1, num_ctx: 4096 },
    });
    expect((calls[0].body.messages as { content: string }[])[0].content).toBe("SYSTEM");
    const refused = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(warm(endpoint, "SYSTEM", { fetchImpl: refused })).resolves.toBeUndefined();
  });
});
