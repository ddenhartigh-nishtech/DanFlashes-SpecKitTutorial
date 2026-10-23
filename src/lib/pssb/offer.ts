/**
 * "Add it" comes from his words, not the model's (012 R3; constitution v5.1.0). A shopper who says
 * he's buying, names a shirt (or means the one on the page), and gives a size gets an offer built
 * from the store, but only for a shirt Add to Cart would accept. Otherwise PSSB is told what to say:
 * ask for the size, refuse a BLAND shirt, or say it isn't available. No offer means no button.
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

function sizeOf(word: string): Size {
  const w = word.toLowerCase().replace(/[- ]/g, "");
  if (w === "xxl" || w === "2xl" || w === "xxlarge") return "XXL";
  if (w === "xl" || w === "extralarge") return "XL";
  if (w === "s" || w === "small") return "S";
  if (w === "m" || w === "medium") return "M";
  return "L";
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The shirt he means: one he names (longest name first), or the page's when he says "it". */
function shirtMeant(message: string, page: string, all: CatalogShirt[]): CatalogShirt | null {
  const byLength = [...all].sort((a, b) => b.name.length - a.name.length);
  for (const shirt of byLength) {
    if (new RegExp(`(?<![\\w'’])${escapeRegex(shirt.name)}(?![\\w'’])`, "i").test(message)) {
      return shirt;
    }
  }
  const slug = /^\/shirts\/([a-z0-9-]+)$/.exec(page)?.[1];
  if (slug && PAGE_SHIRT.test(message)) return all.find((s) => s.slug === slug) ?? null;
  return null;
}

export function detectOffer(
  db: Db,
  message: string,
  page: string,
  userId: number | null,
): OfferResult {
  if (!INTENT.test(message)) return { kind: "none" };
  const all = listCatalogShirts(db, { includeInactive: true, includeUnlisted: true });
  const shirt = shirtMeant(message, page, all);
  if (!shirt) return { kind: "none" };

  // The same questions Add to Cart asks: on the floor, and his to buy.
  if (shirt.status !== "active" || !canBuy(shirt, userId))
    return { kind: "tell", tell: "unavailable" };
  if (shirt.tier.isBland && getSettings(db).blandShaming)
    return { kind: "tell", tell: "refuse-bland" };
  if (NO_SUCH_SIZE.test(message)) return { kind: "tell", tell: "unavailable" };
  const size = SIZE.exec(message.replace(new RegExp(escapeRegex(shirt.name), "i"), ""));
  if (!size) return { kind: "tell", tell: "ask-size" };

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
