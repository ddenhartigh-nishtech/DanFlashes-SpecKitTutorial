/**
 * PSSB's model, over Ollama's chat API (012 R1, R6). The store never waits on it (FR-017;
 * constitution v5.1.0): no response in 5 s is unreachable, no first words in 20 s or more than 45 s
 * in all is a timeout, and the caller swaps in a canned line.
 */
import type { PssbEndpoint } from "@/lib/pssb/endpoint";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class PssbUnreachable extends Error {
  name = "PssbUnreachable";
}
export class PssbTimeout extends Error {
  name = "PssbTimeout";
}

const KEEP_ALIVE = "2h";
const CONTEXT = 4096;

interface StreamOptions {
  connectMs?: number;
  firstWordMs?: number;
  totalMs?: number;
  /** The shopper went away: stop the model. */
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

/** The reply's words as Ollama streams them. Throws PssbUnreachable or PssbTimeout. */
export async function* streamChat(
  endpoint: PssbEndpoint,
  messages: ChatMessage[],
  {
    connectMs = 5_000,
    firstWordMs = 20_000,
    totalMs = 45_000,
    signal,
    fetchImpl = fetch,
  }: StreamOptions = {},
): AsyncGenerator<string> {
  const controller = new AbortController();
  let reason: Error | null = null;
  const stop = (error: Error) => {
    if (reason) return;
    reason = error;
    controller.abort();
  };
  const connect = setTimeout(() => stop(new PssbUnreachable("no response")), connectMs);
  const first = setTimeout(() => stop(new PssbTimeout("no first words")), firstWordMs);
  const total = setTimeout(() => stop(new PssbTimeout("too long")), totalMs);
  const onAbort = () => stop(new PssbTimeout("cancelled"));
  signal?.addEventListener("abort", onAbort);

  try {
    let response: Response;
    try {
      response = await fetchImpl(`${endpoint.url}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: endpoint.model,
          messages,
          stream: true,
          keep_alive: KEEP_ALIVE,
          options: { num_predict: 90, num_ctx: CONTEXT, temperature: 0.8 },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      throw reason ?? new PssbUnreachable(String(error));
    }
    clearTimeout(connect);
    if (!response.ok || !response.body) throw new PssbUnreachable(`HTTP ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      let read: ReadableStreamReadResult<Uint8Array>;
      try {
        read = await reader.read();
      } catch (error) {
        throw reason ?? new PssbUnreachable(String(error));
      }
      if (read.done) return;
      buffer += decoder.decode(read.value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        const event = JSON.parse(line) as {
          message?: { content?: string };
          done?: boolean;
          error?: string;
        };
        if (event.error) throw new PssbUnreachable(event.error);
        const content = event.message?.content;
        if (content) {
          clearTimeout(first);
          yield content;
        }
        if (event.done) return;
      }
    }
  } finally {
    clearTimeout(connect);
    clearTimeout(first);
    clearTimeout(total);
    signal?.removeEventListener("abort", onAbort);
    controller.abort();
  }
}

/**
 * Load the model and cache the stable prompt, so the next shopper finds it ready (R6, analysis U1).
 * Detached from any shopper; never throws.
 */
export async function warm(
  endpoint: PssbEndpoint,
  system: string,
  { fetchImpl = fetch }: { fetchImpl?: typeof fetch } = {},
): Promise<void> {
  try {
    await fetchImpl(`${endpoint.url}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: endpoint.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: "Hello." },
        ],
        stream: false,
        keep_alive: KEEP_ALIVE,
        options: { num_predict: 1, num_ctx: CONTEXT },
      }),
    });
  } catch {
    // The next shopper gets a canned line instead. Nothing to report.
  }
}
