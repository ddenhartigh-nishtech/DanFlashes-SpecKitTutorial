/**
 * A bot is a voice, not a source (constitution v5.1.0; 012 R4). PSSB's words stream through two
 * checks the store controls:
 *
 * - the price guard: a dollar amount the store didn't give him is never shown, not even for a moment
 * - the claim guard (amended 2026-11-11, Q8): only pressing Add it adds, so a sentence saying a
 *   shirt was added, or is now his, is never shown either
 * - linking: only whole names of shirts the store sells become links
 */
import { copy } from "@/lib/copy";
import { formatUsd, tryParseUsd } from "@/lib/money";

/**
 * A sentence claiming a cart change the store never made (R3 amended). "Already in your cart" is
 * left alone: he knows the cart (FR-005), so that can be true. Questions are never claims.
 */
const CLAIMS = [
  /\b(?:was|were|been|be|is|are|i'?ve|i have|we'?ve|we have|i just|i'?ve just)\s+(?:\w+\s+){0,2}?added\b/i,
  /\badded\b[^.!?]*\b(?:cart|bag)\b/i,
  /\b(?:i'?m|i am|we'?re|we are) adding\b/i,
  /(?<!\b(?:choice|decision|call|move|pleasure)\s)\b(?:is|are|it'?s|they'?re)\s+(?:now\s+|all\s+|officially\s+)?yours\b/i,
  /\bnow in your (?:cart|bag)\b/i,
  /\bin your (?:cart|bag) now\b/i,
];
/** A word that might start a claim: its sentence is held until it ends (analysis C1). */
const TRIGGER = /\b(?:added|adding|yours|cart|bag)\b/i;
const SENTENCE_END = /[.!?]["”')]?\s*$/;

export function isClaim(sentence: string): boolean {
  const text = sentence.trim().replace(/’/g, "'");
  if (/\?["”')]*$/.test(text)) return false;
  return CLAIMS.some((claim) => claim.test(text));
}

/** The reply without its claims, and whether any were dropped. */
export function dropClaims(text: string): { text: string; dropped: boolean } {
  const sentences = text.trim().split(/(?<=[.!?]["”')]?)\s+/);
  const kept = sentences.filter((s) => !isClaim(s));
  return { text: kept.join(" "), dropped: kept.length < sentences.length };
}

/** "$1,350.00", "$1350", "$40": commas only where they belong, so "$1,350, and" keeps its comma. */
const AMOUNT = /\$(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/g;

/** "$1350", "$1,350.00" → "1350.00"; anything else → null. */
function canonical(amount: string): string | null {
  const usd = tryParseUsd(amount);
  return usd === null ? null : usd;
}

/**
 * Words as they arrive, with each dollar amount checked against the amounts the store gave him, and
 * any sentence with a claim word held until it ends, then shown or dropped (Q8, analysis C1).
 */
export function guardStream(allowed: ReadonlySet<string>) {
  let held = "";
  let full = "";
  /** The current sentence: the part already shown, and the part held since a trigger word. */
  let shown = "";
  let waiting = "";
  let holding = false;
  const refused: string[] = [];
  const clean = (text: string) =>
    text.replace(AMOUNT, (amount) => {
      const usd = canonical(amount);
      if (usd !== null && allowed.has(usd)) return formatUsd(usd);
      refused.push(usd ?? amount);
      return copy.pssb.priceGuard;
    });
  /** The held part of the sentence, unless the whole sentence is a claim. */
  const settle = () => {
    const out = holding && !isClaim(shown + waiting) ? waiting : "";
    shown = waiting = "";
    holding = false;
    return out;
  };
  const release = (text: string) => {
    full += text;
    let out = "";
    for (const word of text.match(/\S+\s*|\s+/g) ?? []) {
      if (!holding && TRIGGER.test(word)) holding = true;
      if (holding) waiting += word;
      else {
        out += word;
        shown += word;
      }
      if (word.trim() && SENTENCE_END.test(word)) out += settle();
    }
    return out;
  };
  return {
    /** Everything up to the last whitespace is safe to show; the last word waits for the next chunk. */
    push(chunk: string): string {
      held += chunk;
      const cut = Math.max(held.lastIndexOf(" "), held.lastIndexOf("\n")) + 1;
      if (cut === 0) return "";
      const ready = held.slice(0, cut);
      held = held.slice(cut);
      return release(clean(ready));
    },
    end(): string {
      const rest = release(clean(held));
      held = "";
      return rest + settle();
    },
    /** Everything he said, after the price guard: what the finished reply is built from. */
    text: () => full,
    refused,
  };
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The finished reply as HTML: escaped text, with each whole shirt name linked to its page, and each
 * of the store's `places` (the designer, FR-008) linked to its own. `linked` lists only the shirts.
 */
export function linkShirts(
  text: string,
  shirts: readonly { name: string; slug: string }[],
  places: readonly { phrase: string; href: string }[] = [],
): { html: string; linked: string[] } {
  const targets = new Map<string, { href: string; slug?: string }>([
    ...places.map((p) => [p.phrase.toLowerCase(), { href: p.href }] as const),
    ...shirts.map(
      (s) => [s.name.toLowerCase(), { href: `/shirts/${s.slug}`, slug: s.slug }] as const,
    ),
  ]);
  if (targets.size === 0) return { html: escapeHtml(text), linked: [] };
  const names = [...targets.keys()].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(?<![\\w'])(${names.map(escapeRegex).join("|")})(?![\\w'])`, "gi");
  const linked: string[] = [];
  let html = "";
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const target = targets.get(match[0].toLowerCase())!;
    html += escapeHtml(text.slice(last, match.index));
    html += `<a href="${target.href}">${escapeHtml(match[0])}</a>`;
    if (target.slug && !linked.includes(target.slug)) linked.push(target.slug);
    last = match.index + match[0].length;
  }
  return { html: html + escapeHtml(text.slice(last)), linked };
}
