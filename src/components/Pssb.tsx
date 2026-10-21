"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { addToCart } from "@/actions/cart";
import { copy } from "@/lib/copy";
import { formatUsd } from "@/lib/money";
import { approachDue, CHAT_KEY, CLOSED_KEY, LAST_KEY } from "@/lib/pssb/clock";

const p = copy.pssb;
const LIMIT = 500;
const TURNS = 6;
const CHECK_MS = 5_000;

interface Offer {
  slug: string;
  name: string;
  size: string;
  priceUsd: string;
}
interface Message {
  role: "shopper" | "pssb" | "store";
  text: string;
  /** The finished reply from the store: escaped text with links the store made (R4). */
  html?: string;
  offer?: Offer | null;
}
type PssbEvent =
  | { t: "text"; s: string }
  | { t: "done"; html: string; offer: Offer | null }
  | { t: "canned"; s: string; offer: Offer | null };

// Storage can be missing or throw (private windows, blocked storage): PSSB just forgets.
const store = {
  get(area: "local" | "session", key: string): string | null {
    try {
      return (area === "local" ? localStorage : sessionStorage).getItem(key);
    } catch {
      return null;
    }
  },
  set(area: "local" | "session", key: string, value: string | null) {
    try {
      const s = area === "local" ? localStorage : sessionStorage;
      if (value === null) s.removeItem(key);
      else s.setItem(key, value);
    } catch {
      // nothing to remember with
    }
  },
};

const readLast = () => {
  const n = Number(store.get("local", LAST_KEY));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const touch = () => store.set("local", LAST_KEY, String(Date.now()));

/** POST /api/pssb, calling `onEvent` for each NDJSON line (contracts/pssb.md). */
async function ask(body: object, onEvent: (event: PssbEvent) => void): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/pssb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    onEvent({ t: "canned", s: p.unreachable, offer: null });
    return;
  }
  if (!response.ok || !response.body) {
    onEvent({ t: "canned", s: p.unreachable, offer: null });
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onEvent(JSON.parse(line) as PssbEvent);
    }
  }
}

/** This tab's conversation so far, or none. */
function savedChat(): Message[] {
  const saved = store.get("session", CHAT_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved) as Message[];
  } catch {
    return [];
  }
}

/** The turns the model sees: the shopper's and PSSB's, never the store's own notes. */
const historyOf = (messages: Message[]) =>
  messages
    .filter((m) => m.role !== "store" && m.text.trim())
    .slice(-TURNS)
    .map((m) => ({ role: m.role, text: m.text.slice(0, LIMIT) }));

/**
 * PSSB, the Pushy Shirt Sales Bot (012 US1–US4, R8, R9): a launcher in the corner, a bubble when he
 * approaches, and a chat panel the shopper opens. Every fact, price, link and "Add it" comes from the
 * store; this component only shows them.
 */
export function Pssb() {
  const [open, setOpen] = useState(false);
  // The visit's conversation (FR-015): this tab only, never the store. PSSB renders only in the
  // browser (PssbLoader), so the saved chat can be read as he mounts.
  const [messages, setMessages] = useState<Message[]>(savedChat);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [bubble, setBubble] = useState<Message | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  /** What the approach timer needs to know, kept current without restarting the timer. */
  const state = useRef({ input, streaming, open, messages });
  useEffect(() => {
    state.current = { input, streaming, open, messages };
  }, [input, streaming, open, messages]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    store.set("session", CHAT_KEY, JSON.stringify(messages.slice(-30)));
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  // Warm the model as the page loads (analysis U1), and start the approach clock on a first visit.
  useEffect(() => {
    void fetch("/api/pssb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "warm", page: window.location.pathname, history: [] }),
    }).catch(() => undefined);
    if (readLast() === null) touch();
  }, []);

  /** Stream one PSSB turn into `apply`, which places it in the panel or the bubble. */
  const run = useCallback(
    async (body: object, apply: (update: (m: Message) => Message) => void) => {
      setStreaming(true);
      await ask(body, (event) => {
        if (event.t === "text") apply((m) => ({ ...m, text: m.text + event.s }));
        else if (event.t === "done") apply((m) => ({ ...m, html: event.html, offer: event.offer }));
        else apply(() => ({ role: "pssb", text: event.s, offer: event.offer }));
      });
      touch();
      setStreaming(false);
    },
    [],
  );

  // Approaches every 2 minutes (FR-012–FR-014), on the clock every tab shares.
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const due = approachDue(now, readLast(), {
        typing: state.current.input.trim() !== "",
        streaming: state.current.streaming,
        dialogOpen: document.querySelector("dialog[open]") !== null,
        hidden: document.visibilityState === "hidden",
      });
      if (!due) return;
      store.set("local", LAST_KEY, String(now)); // claim it before another tab does
      const closedLast = store.get("local", CLOSED_KEY) === "1";
      store.set("local", CLOSED_KEY, null);
      const body = {
        kind: "approach",
        page: window.location.pathname,
        history: historyOf(state.current.messages),
        closedLast,
      };
      if (state.current.open) {
        setMessages((all) => [...all, { role: "pssb", text: "" }]);
        void run(body, (update) =>
          setMessages((all) => [...all.slice(0, -1), update(all.at(-1)!)]),
        );
      } else {
        setBubble({ role: "pssb", text: "" });
        void run(body, (update) => setBubble((b) => update(b ?? { role: "pssb", text: "" })));
      }
    }, CHECK_MS);
    return () => clearInterval(timer);
  }, [run]);

  function close() {
    setOpen(false);
    store.set("local", CLOSED_KEY, "1");
  }

  function openFromBubble() {
    if (bubble && bubble.text) setMessages((all) => [...all, bubble]);
    setBubble(null);
    setOpen(true);
  }

  function dismissBubble() {
    setBubble(null);
    store.set("local", CLOSED_KEY, "1");
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim().slice(0, LIMIT);
    if (!message || streaming) return;
    const history = historyOf(messages);
    setInput("");
    setMessages((all) => [...all, { role: "shopper", text: message }, { role: "pssb", text: "" }]);
    await run({ kind: "reply", message, page: window.location.pathname, history }, (update) =>
      setMessages((all) => [...all.slice(0, -1), update(all.at(-1)!)]),
    );
  }

  /** "Add it" (FR-011): the shirt page's own Add to Cart, rules and all. */
  async function addIt(offer: Offer) {
    setAdding(offer.slug);
    const form = new FormData();
    form.set("slug", offer.slug);
    form.set("size", offer.size);
    const result = await addToCart(null, form);
    setAdding(null);
    setMessages((all) => [...all, { role: "store", text: result.message ?? p.unreachable }]);
  }

  const lastPssb = messages.findLast((m) => m.role === "pssb");
  const judging = streaming && open && lastPssb !== undefined && lastPssb.text === "";

  return (
    <div data-steady className="text-ink">
      {bubble && !open ? (
        <div
          data-steady
          data-testid="pssb-bubble"
          className="border-ink bg-highlighter fixed right-3 bottom-20 z-40 flex w-[min(17.5rem,calc(100vw-1.5rem))] items-start gap-2 border-4 p-3 font-bold shadow-[4px_4px_0_var(--color-hot-pink)]"
        >
          <button
            type="button"
            onClick={openFromBubble}
            className="flex-1 text-left [overflow-wrap:anywhere]"
          >
            {bubble.html ? (
              <span dangerouslySetInnerHTML={{ __html: bubble.html }} />
            ) : (
              bubble.text || p.judging
            )}
          </button>
          <button
            type="button"
            data-testid="pssb-bubble-close"
            onClick={dismissBubble}
            aria-label={p.dismiss}
            title={p.dismiss}
            className="bg-hot-pink text-paper border-ink font-display flex size-8 shrink-0 items-center justify-center rounded-full border-4 text-xs leading-none"
          >
            ✕
          </button>
        </div>
      ) : null}

      {open ? (
        <section
          data-steady
          data-testid="pssb-panel"
          aria-label={p.name}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className="border-ink bg-paper fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col border-t-4 shadow-[0_-4px_0_var(--color-hot-pink)] md:inset-x-auto md:right-3 md:bottom-20 md:h-[32.5rem] md:max-h-[calc(100vh-7rem)] md:w-[22.5rem] md:border-4 md:shadow-[6px_6px_0_var(--color-hot-pink)]"
        >
          <header className="bg-ink text-highlighter flex items-center gap-3 px-4 py-2">
            <div className="flex-1">
              <p className="font-display text-lg leading-none">{p.name}</p>
              <p className="text-paper text-xs">{p.tagline}</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={p.close}
              title={p.close}
              className="bg-hot-pink text-paper border-paper font-display flex size-8 items-center justify-center rounded-full border-2 text-xs"
            >
              ✕
            </button>
          </header>

          <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
            {messages.length === 0 ? <p className="text-sm font-bold">{p.welcome}</p> : null}
            {messages.map((m, i) =>
              m.role === "pssb" && m.text === "" && !m.html ? null : (
                <div
                  key={i}
                  data-testid="pssb-message"
                  data-role={m.role}
                  className={
                    m.role === "shopper"
                      ? "bg-acid border-ink self-end border-4 px-3 py-2 [overflow-wrap:anywhere]"
                      : m.role === "store"
                        ? "bg-highlighter border-ink self-start border-4 px-3 py-2 text-sm font-bold [overflow-wrap:anywhere]"
                        : "bg-paper border-ink self-start border-4 px-3 py-2 font-bold [overflow-wrap:anywhere] [&_a]:underline [&_a]:decoration-4"
                  }
                >
                  {m.html ? <span dangerouslySetInnerHTML={{ __html: m.html }} /> : m.text}
                  {m.offer ? (
                    <button
                      type="button"
                      data-steady
                      data-testid="pssb-add"
                      disabled={adding !== null}
                      onClick={() => void addIt(m.offer!)}
                      className="font-display bg-hot-pink text-paper mt-2 block min-h-11 w-full px-3 text-left uppercase shadow-[3px_3px_0_var(--color-ink)] disabled:opacity-60"
                    >
                      {adding === m.offer.slug
                        ? p.adding
                        : p.addIt(m.offer.name, m.offer.size, formatUsd(m.offer.priceUsd))}
                    </button>
                  ) : null}
                </div>
              ),
            )}
            {judging ? (
              <p data-testid="pssb-judging" className="self-start text-sm font-bold italic">
                {p.judging}
              </p>
            ) : null}
          </div>

          <form onSubmit={send} className="border-ink flex gap-2 border-t-4 p-3">
            <label className="sr-only" htmlFor="pssb-input">
              {p.placeholder}
            </label>
            <input
              id="pssb-input"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, LIMIT))}
              maxLength={LIMIT}
              placeholder={p.placeholder}
              autoComplete="off"
              className="border-ink bg-paper min-h-11 min-w-0 flex-1 border-4 px-2"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="font-display bg-ink text-highlighter min-h-11 px-3 uppercase disabled:opacity-60"
            >
              {p.send}
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        data-steady
        data-testid="pssb-launcher"
        onClick={() => (open ? close() : openFromBubble())}
        aria-label={p.launcher}
        title={p.launcher}
        aria-expanded={open}
        className="font-display bg-hot-pink text-paper border-ink fixed right-3 bottom-3 z-40 flex size-14 items-center justify-center rounded-full border-4 text-sm shadow-[4px_4px_0_var(--color-ink)]"
      >
        {p.name}
      </button>
    </div>
  );
}
