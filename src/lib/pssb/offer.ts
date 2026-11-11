/**
 * "Add it" comes from his words, not the model's (012 R3; constitution v5.1.0). A shopper who says
 * he's buying, names a shirt (or means the one on the page), and gives a size gets an offer built
 * from the store, but only for a shirt Add to Cart would accept. Otherwise PSSB is told what to say:
 * ask for the size, refuse a BLAND shirt, or say it isn't available. No offer means no button.
 *
 * Amended 2026-11-11 (Q7): his last few messages count together, so "Add Geo Riot" … "XXL" … "yes"
 * is one request. Only his own messages are ever passed in; PSSB's never are.
 */
import { canBuy } from "@/lib/catalog/one-of-a-kind";
import type { Size } from "@/lib/catalog/types";
import type { Db } from "@/lib/db/client";
import { getSettings } from "@/lib/data/settings";
import { listCatalogShirts, type CatalogShirt } from "@/lib/data/shirts";
import type { Usd } from "@/lib/money";

export interface Offer {
  slug: string;
  name: string;
  size: Size;
  priceUsd: Usd;
}

export type OfferResult =
  | { kind: "offer"; offer: Offer }
  | { kind: "tell"; tell: "ask-size" | "refuse-bland" | "unavailable" }
  | { kind: "none" };

const INTENT =
  /\b(add|buy|purchase|i['’]?ll take|i will take|get me|ring (?:it|me) up|in(?:to)? my cart|i want (?:it|this|that|one))\b/i;
const PAGE_SHIRT = /\b(it|this|that|this one|that one)\b/i;
/** Sizes, never the "m" in "I'm" or the "s" in "Dan's". */
const SIZE = /(?<![\w'’])(xx-large|extra[- ]large|xxl|2xl|xl|small|medium|large|s|m|l)(?![\w'’])/i;
const NO_SUCH_SIZE = /(?<![\w'’])(x{3,}l|[3-9]xl|xs|extra small)(?![\w'’])/i;

/** How many of his earlier messages count with the new one (R3 amended: a window of 3). */
export const EARLIER_MESSAGES = 2;

/**
 * A plain yes (R3 amended, analysis U2): the whole message, at most 5 words, every one a yes or a
 * filler, and at least one a real yes. "please" alone is not a yes.
 */
const YES_WORDS = [
  "yes",
  "yeah",
  "yep",
  "yup",
  "sure",
  "ok",
  "okay",
  "alright",
  "absolutely",
  "definitely",
  "certainly",
  "of course",
  "go ahead",
  "do it",
  "let's do it",
];
const FILLERS = ["please", "thanks", "thank you", "sir", "pssb"];
function isAffirmation(message: string): boolean {
  let rest = ` ${message
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z' ]+/g, " ")} `;
  if (rest.trim().split(/\s+/).length > 5) return false;
  let yes = false;
  for (const phrase of [...YES_WORDS, ...FILLERS].sort((a, b) => b.length - a.length)) {
    const spaced = ` ${phrase} `;
    while (rest.includes(spaced)) {
      rest = rest.replace(spaced, " ");
      if (YES_WORDS.includes(phrase)) yes = true;
    }
  }
  return yes && rest.trim() === "";
}

function sizeOf(word: string): Size {
  const w = word.toLowerCase().replace(/[- ]/g, "");
  if (w === "xxl" || w === "2xl" || w === "xxlarge") return "XXL";
  if (w === "xl" || w === "extralarge") return "XL";
  if (w === "s" || w === "small") return "S";
  if (w === "m" || w === "medium") return "M";
  return "L";
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const nameIn = (message: string, shirt: CatalogShirt) =>
  new RegExp(`(?<![\\w'’])${escapeRegex(shirt.name)}(?![\\w'’])`, "i").test(message);

/** The shirt a message names, longest name first, so "Geo Riot Deluxe" beats "Geo Riot". */
function namedIn(message: string, byLength: CatalogShirt[]): CatalogShirt | null {
  return byLength.find((shirt) => nameIn(message, shirt)) ?? null;
}

/**
 * The shirt he means, and which message of the window meant it: the newest one he names, or else the
 * page's shirt for the newest "it" or "this one". A yes is never "it" ("do it"; analysis U1).
 */
function shirtMeant(
  window: string[],
  page: string,
  all: CatalogShirt[],
): { shirt: CatalogShirt; at: number } | null {
  const byLength = [...all].sort((a, b) => b.name.length - a.name.length);
  for (let at = window.length - 1; at >= 0; at--) {
    const shirt = namedIn(window[at], byLength);
    if (shirt) return { shirt, at };
  }
  const slug = /^\/shirts\/([a-z0-9-]+)$/.exec(page)?.[1];
  const onPage = slug ? all.find((s) => s.slug === slug) : undefined;
  if (!onPage) return null;
  for (let at = window.length - 1; at >= 0; at--) {
    if (!isAffirmation(window[at]) && PAGE_SHIRT.test(window[at])) return { shirt: onPage, at };
  }
  return null;
}

/**
 * @param earlier his own last messages, oldest first (never PSSB's); only the last
 *   {@link EARLIER_MESSAGES} count.
 */
export function detectOffer(
  db: Db,
  message: string,
  earlier: readonly string[],
  page: string,
  userId: number | null,
): OfferResult {
  const window = [...earlier.slice(-EARLIER_MESSAGES), message];
  if (!window.some((m) => INTENT.test(m))) return { kind: "none" };
  const all = listCatalogShirts(db, { includeInactive: true, includeUnlisted: true });

  // The new message must add something, or an old request would come back on any reply.
  const adds =
    INTENT.test(message) ||
    SIZE.test(message) ||
    NO_SUCH_SIZE.test(message) ||
    isAffirmation(message) ||
    all.some((shirt) => nameIn(message, shirt));
  if (!adds) return { kind: "none" };

  const meant = shirtMeant(window, page, all);
  if (!meant) return { kind: "none" };
  const { shirt, at } = meant;

  // The same questions Add to Cart asks: on the floor, and his to buy.
  if (shirt.status !== "active" || !canBuy(shirt, userId))
    return { kind: "tell", tell: "unavailable" };
  if (shirt.tier.isBland && getSettings(db).blandShaming)
    return { kind: "tell", tell: "refuse-bland" };

  // The newest size from the shirt's message on: a size said before it was for another shirt.
  const withoutName = new RegExp(escapeRegex(shirt.name), "gi");
  for (let i = window.length - 1; i >= at; i--) {
    const words = window[i].replace(withoutName, "");
    if (NO_SUCH_SIZE.test(words)) return { kind: "tell", tell: "unavailable" };
    const size = SIZE.exec(words);
    if (size) {
      return {
        kind: "offer",
        offer: {
          slug: shirt.slug,
          name: shirt.name,
          size: sizeOf(size[1]),
          priceUsd: shirt.finalPriceUsd,
        },
      };
    }
  }
  return { kind: "tell", tell: "ask-size" };
}
