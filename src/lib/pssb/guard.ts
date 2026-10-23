/**
 * A bot is a voice, not a source (constitution v5.1.0; 012 R4). PSSB's words stream through two
 * checks the store controls:
 *
 * - the price guard: a dollar amount the store didn't give him is never shown, not even for a moment
 * - linking: only whole names of shirts the store sells become links
 */
import { copy } from "@/lib/copy";
import { formatUsd, tryParseUsd } from "@/lib/money";

/** "$1,350.00", "$1350", "$40": commas only where they belong, so "$1,350, and" keeps its comma. */
const AMOUNT = /\$(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/g;

/** "$1350", "$1,350.00" → "1350.00"; anything else → null. */
function canonical(amount: string): string | null {
  const usd = tryParseUsd(amount);
  return usd === null ? null : usd;
}

/** Words as they arrive, with each dollar amount checked against the amounts the store gave him. */
export function guardStream(allowed: ReadonlySet<string>) {
  let held = "";
  const refused: string[] = [];
  const clean = (text: string) =>
    text.replace(AMOUNT, (amount) => {
      const usd = canonical(amount);
      if (usd !== null && allowed.has(usd)) return formatUsd(usd);
      refused.push(usd ?? amount);
      return copy.pssb.priceGuard;
    });
  return {
    /** Everything up to the last whitespace is safe to show; the last word waits for the next chunk. */
    push(chunk: string): string {
      held += chunk;
      const cut = Math.max(held.lastIndexOf(" "), held.lastIndexOf("\n")) + 1;
      if (cut === 0) return "";
      const ready = held.slice(0, cut);
      held = held.slice(cut);
      return clean(ready);
    },
    end(): string {
      const rest = clean(held);
      held = "";
      return rest;
    },
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
