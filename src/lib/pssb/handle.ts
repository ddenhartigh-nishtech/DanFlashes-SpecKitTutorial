/**
 * POST /api/pssb (012 R6, contracts/pssb.md): the store's side of every PSSB reply. It reads the
 * shopper from his cookies, builds the facts from the store's own data, redacts what he typed, asks
 * the model, and streams the reply back through the price guard, with links and any offer made by
 * the store (constitution v5.1.0: a bot is a voice, not a source). Nothing here is logged.
 */
import { createHash } from "node:crypto";
import { findSessionUser } from "@/lib/auth/session";
import { copy } from "@/lib/copy";
import type { Db } from "@/lib/db/client";
import { getSettings } from "@/lib/data/settings";
import { CART_COOKIE, requestCookie, SESSION_COOKIE } from "@/lib/http/cookies";
import { pssbEndpoint } from "@/lib/pssb/endpoint";
import { hintsFor, pageLine, shopperFacts, stableFacts } from "@/lib/pssb/facts";
import { guardStream, linkShirts } from "@/lib/pssb/guard";
import { streamChat, warm, type ChatMessage } from "@/lib/pssb/ollama";
import { detectOffer, type Offer } from "@/lib/pssb/offer";
import { approachInstruction, TELLS } from "@/lib/pssb/persona";
import { redact } from "@/lib/pssb/redact";

export interface PssbDeps {
  fetchImpl: typeof fetch;
  env: Record<string, string | undefined>;
  /** For picking canned lines; injectable so tests can pick. */
  random: () => number;
}

export const LIMITS = { message: 500, turns: 6, page: 200 } as const;

interface Turn {
  role: "shopper" | "pssb";
  text: string;
}
type Body =
  | { kind: "reply"; message: string; page: string; history: Turn[] }
  | { kind: "approach"; page: string; history: Turn[]; closedLast: boolean }
  | { kind: "warm"; page: string; history: Turn[] };

/** The request, or null for anything malformed or too long (400). */
function readBody(raw: unknown): Body | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const page = body.page;
  if (typeof page !== "string" || !page.startsWith("/") || page.startsWith("//")) return null;
  if (page.length > LIMITS.page) return null;
  const history = body.history ?? [];
  if (!Array.isArray(history) || history.length > LIMITS.turns) return null;
  const turns: Turn[] = [];
  for (const turn of history) {
    const t = turn as Record<string, unknown>;
    if ((t.role !== "shopper" && t.role !== "pssb") || typeof t.text !== "string") return null;
    if (t.text.length > LIMITS.message) return null;
    turns.push({ role: t.role, text: t.text });
  }
  if (body.kind === "warm") return { kind: "warm", page, history: turns };
  if (body.kind === "approach") {
    return { kind: "approach", page, history: turns, closedLast: body.closedLast === true };
  }
  if (body.kind === "reply") {
    const message = body.message;
    if (typeof message !== "string" || message.trim() === "") return null;
    if (message.length > LIMITS.message) return null;
    return { kind: "reply", message, page, history: turns };
  }
  return null;
}

/** The stable prompts already warmed in this process (R6): one warm per new prompt. */
const warmed = new Set<string>();
const hashOf = (text: string) => createHash("sha256").update(text).digest("hex");

const ORDER_TROUBLE =
  /\b(order|refund|return|deliver|delivery|shipping|ship|arriv|track|package|support|contact|complain)/i;

/** He never says what he is (FR-001): a reply that does is replaced, whole, by one that doesn't. */
const BROKE_CHARACTER =
  /\b(language model|as an ai|i'?m an ai|i am an ai|an ai (?:model|assistant)|trained on|my training data|system prompt)\b/i;

/** A reply cut off by the length cap ends at its last whole sentence. */
export function wholeSentences(text: string): string {
  const trimmed = text.trim();
  const end = Math.max(
    trimmed.lastIndexOf(". "),
    trimmed.lastIndexOf("! "),
    trimmed.lastIndexOf("? "),
  );
  if (/[.!?]["”')]?$/.test(trimmed) || end < 0) return trimmed;
  return trimmed.slice(0, end + 1);
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

/** The in-character line when the model can't answer (FR-007, FR-017). */
function cannedLine(body: Body, supportEmail: string | null, random: () => number): string {
  if (body.kind === "approach")
    return body.closedLast ? copy.pssb.sulk : pick(copy.pssb.openers, random);
  if (body.kind === "reply" && ORDER_TROUBLE.test(body.message)) {
    return supportEmail
      ? `${copy.pssb.supportLead} ${supportEmail}. ${copy.pssb.supportTail}`
      : pick(copy.pssb.excuses, random);
  }
  return copy.pssb.unreachable;
}

const NDJSON = { "content-type": "application/x-ndjson", "cache-control": "no-store" };

export async function handlePssb(db: Db, request: Request, deps: PssbDeps): Promise<Response> {
  const settings = getSettings(db);
  if (!settings.pushySalesBot) return new Response(null, { status: 404 });
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const body = readBody(raw);
  if (!body) return new Response(null, { status: 400 });

  const endpoint = pssbEndpoint(settings, deps.env);
  const stable = stableFacts(db);
  const key = hashOf(`${endpoint.url}|${endpoint.model}|${stable.text}`);
  if (body.kind === "warm") {
    if (!warmed.has(key)) {
      warmed.add(key);
      void warm(endpoint, stable.text, { fetchImpl: deps.fetchImpl });
    }
    return new Response(null, { status: 204 });
  }
  warmed.add(key); // this request caches the prompt itself

  const user = findSessionUser(db, requestCookie(request, SESSION_COOKIE));
  const shopper = shopperFacts(
    db,
    {
      userId: user?.id ?? null,
      displayName: user?.displayName ?? null,
      cartId: requestCookie(request, CART_COOKIE) ?? null,
    },
    stable.settings,
  );
  const allowed = new Set([...stable.allowed, ...shopper.allowed]);

  let offer: Offer | null = null;
  const notes = [pageLine(body.page, stable.shirts)];
  if (body.kind === "reply") {
    notes.push(...hintsFor(body.message, stable.shirts));
    const result = detectOffer(db, body.message, body.page, user?.id ?? null);
    if (result.kind === "offer") {
      offer = result.offer;
      notes.push(TELLS.offer(offer.name, offer.size));
    } else if (result.kind === "tell") {
      notes.push(TELLS[result.tell]);
    }
  } else {
    notes.push(approachInstruction(body.closedLast));
  }

  const messages: ChatMessage[] = [
    { role: "system", content: stable.text },
    { role: "system", content: shopper.text },
    ...body.history.map((t): ChatMessage => ({
      role: t.role === "shopper" ? "user" : "assistant",
      content: t.role === "shopper" ? redact(t.text) : t.text,
    })),
    { role: "system", content: notes.join("\n") },
    {
      role: "user",
      content:
        body.kind === "reply"
          ? redact(body.message)
          : "(He is browsing, and hasn't said anything.)",
    },
  ];

  const encoder = new TextEncoder();
  const line = (event: object) => encoder.encode(`${JSON.stringify(event)}\n`);
  const linkable = stable.shirts.map((s) => ({ name: s.name, slug: s.slug }));
  /** The finished reply (R4, tuned in T031): whole sentences only, in character, links added. */
  const finish = (text: string) => {
    let reply = wholeSentences(
      BROKE_CHARACTER.test(text) ? pick(copy.pssb.inCharacter, deps.random) : text,
    );
    // FR-002: every reply ends by pushing a shirt. If his didn't name one, the store adds the push.
    if (!offer && linkShirts(reply, linkable).linked.length === 0) {
      const featured = stable.shirts.filter((s) => s.featured && !s.bland);
      const pool = featured.length ? featured : stable.shirts.filter((s) => !s.bland);
      if (pool.length)
        reply += ` ${pick(copy.pssb.pushes, deps.random)(pick(pool, deps.random).name)}`;
    }
    return linkShirts(reply, linkable).html;
  };
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const guard = guardStream(allowed);
      let shown = "";
      try {
        for await (const chunk of streamChat(endpoint, messages, {
          fetchImpl: deps.fetchImpl,
          signal: request.signal,
        })) {
          const out = guard.push(chunk);
          if (out) {
            shown += out;
            controller.enqueue(line({ t: "text", s: out }));
          }
        }
        shown += guard.end();
        if (shown.trim() === "") throw new Error("empty reply");
        controller.enqueue(line({ t: "done", html: finish(shown), offer }));
      } catch {
        // Unreachable, slow, or empty: never an error on the page (FR-017). Nothing is logged.
        if (shown.trim()) {
          controller.enqueue(line({ t: "done", html: finish(shown), offer }));
        } else {
          controller.enqueue(
            line({ t: "canned", s: cannedLine(body, settings.supportEmail, deps.random), offer }),
          );
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: NDJSON });
}
