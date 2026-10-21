/**
 * What PSSB is told (012 R2, FR-003–FR-005): built fresh from the store's own data for every reply,
 * in three parts ordered for Ollama's prompt cache. The stable part changes only with the catalog,
 * the switches or the support email; the shopper part with his cart, orders or credit; the page line
 * with every message.
 *
 * Never in any part (FR-004, FR-005; constitution v5.1.0): a complexity score, a resting or unlisted
 * shirt (except his own), card data, a nosy field, a password, or any shopper's email.
 */
import { SIZES, type StoreSettings } from "@/lib/catalog/types";
import { getCartView, findCartId, type CartView } from "@/lib/cart/cart";
import { copy } from "@/lib/copy";
import type { Db } from "@/lib/db/client";
import { listCatalogShirts } from "@/lib/data/shirts";
import { getSettings } from "@/lib/data/settings";
import { getBalanceUsd } from "@/lib/flash-credit/ledger";
import { formatUsd, type Usd } from "@/lib/money";
import { listOrdersForUser } from "@/lib/orders/orders";
import { PERSONA } from "@/lib/pssb/persona";
import { getPerDiemMeter, settleStreams } from "@/lib/streams/streams";

/** A shirt PSSB may name, link and offer: for sale, and shown to every shopper. */
export interface SellableShirt {
  id: number;
  slug: string;
  name: string;
  priceUsd: Usd;
  bland: boolean;
  tier: string;
  style: string;
}

export interface Shopper {
  userId: number | null;
  displayName: string | null;
  /** The guest cart cookie, if any. */
  cartId: string | null;
}

export interface StableFacts {
  text: string;
  shirts: SellableShirt[];
  allowed: Set<string>;
  settings: StoreSettings;
}

const RECENT_ORDERS = 5;

/** The persona and everything about the store: the part Ollama keeps cached (R2). */
export function stableFacts(db: Db): StableFacts {
  const settings = getSettings(db);
  const listed = listCatalogShirts(db).filter((s) => !s.oneOfAKind);
  const shirts: SellableShirt[] = listed.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    priceUsd: s.finalPriceUsd,
    bland: s.tier.isBland,
    tier: s.tier.name,
    style: s.style,
  }));
  const allowed = new Set(shirts.map((s) => s.priceUsd));

  const lines = listed
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (s) =>
        `- ${s.name}: ${s.style}, ${s.tier.name}${s.tier.isBland ? " (BLAND)" : ""}, ${formatUsd(s.finalPriceUsd)}${s.featured ? ", featured" : ""}`,
    );

  const sections = [
    PERSONA,
    `SHIRTS FOR SALE:\n${lines.join("\n")}`,
    `SIZES: every shirt comes in every size: ${SIZES.join(", ")}. Never say a shirt lacks a size.`,
    settings.blandShaming
      ? "BLAND SHIRTS: never sell one. If he wants a BLAND shirt, refuse, shame him, and push something more complicated."
      : "BLAND SHIRTS: for sale, but beneath him. Say so.",
    settings.fakeScarcity
      ? `STOCK: every shirt has only one left: "${copy.urgency.scarce}"`
      : "STOCK: plenty of every shirt. Never claim scarcity.",
    `DAN, IN HIS OWN WORDS:\n${copy.about.sections.map((s) => s.body.join(" ")).join("\n")}`,
    "WHAT SETS THE SHIRTS APART: every shirt starts plain, then gets a pattern on the pattern until the man next to it gets dizzy. The more complicated the pattern, the higher the price, and the tier badge says how complicated it is. All sales are final.",
  ];

  if (settings.patternGenerator) {
    const surcharge = settings.uniquitySurcharge
      ? ` Each one-of-a-kind shirt carries the Uniquity Surcharge of ${formatUsd(settings.uniquitySurchargeUsd)} per shirt, a privilege.`
      : "";
    sections.push(
      `THE SHIRT DESIGNER: "How complicated can it get?" at /how-complicated. A dial runs from BLAND up to too complicated to price; Shuffle draws another pattern; "Make it mine" turns it into his own shirt and needs an account. It is one of a kind, made to order for him alone.${surcharge} Swear his creation will never, ever be mass-produced.`,
    );
    if (settings.uniquitySurcharge) allowed.add(settings.uniquitySurchargeUsd);
  }

  sections.push(
    settings.supportEmail
      ? `ORDER PROBLEMS: Dan's support email is ${settings.supportEmail}. Give it exactly, condescendingly.`
      : "ORDER PROBLEMS: Dan himself cannot be reached, and has no email. Invent an incredible, pompous excuse for why Dan is unavailable (a summit, a knighthood, a pattern emergency), a new one each time. Refer to Dan by name, in the third person. Never give or invent an email address. Then steer him back to the shirts.",
  );

  return { text: sections.join("\n\n"), shirts, allowed, settings };
}

/** The shopper's own facts (R2, FR-005): a guest's cart, or a signed-in shopper's account. */
export function shopperFacts(
  db: Db,
  who: Shopper,
  settings: StoreSettings,
): { text: string; allowed: Set<string>; cart: CartView } {
  const allowed = new Set<string>();
  const amount = (usd: Usd) => {
    allowed.add(usd);
    return formatUsd(usd);
  };
  const cart = getCartView(db, findCartId(db, { cartId: who.cartId, userId: who.userId }));
  const cartLines = cart.lines.map(
    (l) => `${l.shirt.name}, ${l.size} × ${l.quantity}, ${amount(l.lineTotalUsd)}`,
  );
  const cartText = cartLines.length
    ? `HIS CART: ${cartLines.join("; ")}. Subtotal ${amount(cart.subtotalUsd)}.`
    : "HIS CART: empty. Disgraceful.";

  if (who.userId === null) {
    return {
      text: `THE SHOPPER: a guest with no account. Needle him about it.\n${cartText}`,
      allowed,
      cart,
    };
  }

  settleStreams(db, who.userId);
  const orders = listOrdersForUser(db, who.userId).slice(0, RECENT_ORDERS);
  const orderText = orders.length
    ? orders
        .map((o) => {
          const date = new Date(o.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          });
          const shirts = o.lines.map((l) => `${l.name} × ${l.quantity}`).join(", ");
          return `${o.number} on ${date}: ${shirts}; total ${amount(o.totalUsd)}`;
        })
        .join("\n")
    : "none yet. A man with no shirt history.";
  const meter = getPerDiemMeter(db, who.userId, settings);
  const parts = [
    `THE SHOPPER: ${who.displayName?.trim() || "a man who never gave his name"}, signed in.`,
    cartText,
    `HIS RECENT ORDERS:\n${orderText}`,
    `HIS FLASH CREDIT: ${amount(getBalanceUsd(db, who.userId))}.`,
  ];
  if (meter) parts.push(`HIS PER DIEM LEFT: ${amount(meter.leftUsd)}.`);
  return { text: parts.join("\n"), allowed, cart };
}

const SIZE_TALK = /\b(size|sizes|xxl|xl|fit|fits|come in|comes in|small|medium|large)\b/i;
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The facts his question touches, repeated in the last note before he answers (R2): a 3B model
 * heeds what's next to the question far better than a line deep in the prompt (tuned in T031).
 */
export function hintsFor(message: string, shirts: readonly SellableShirt[]): string[] {
  const hints = shirts
    .filter((s) => new RegExp(`(?<![\\w'’])${escapeRegex(s.name)}(?![\\w'’])`, "i").test(message))
    .map(
      (s) =>
        `Fact: ${s.name} is a ${s.tier} ${s.style}, ${formatUsd(s.priceUsd)}, in every size ${SIZES.join(", ")}.`,
    );
  if (SIZE_TALK.test(message))
    hints.push(`Fact: every shirt comes in ${SIZES.join(", ")}. Yes, XXL too.`);
  return hints;
}

/** The page he's on, in a few words (R2). */
export function pageLine(path: string, shirts: readonly SellableShirt[]): string {
  const slug = /^\/shirts\/([a-z0-9-]+)$/.exec(path)?.[1];
  if (slug) {
    const shirt = shirts.find((s) => s.slug === slug);
    return shirt ? `He is looking at ${shirt.name}.` : "He is looking at a shirt page.";
  }
  const where: Record<string, string> = {
    "/": "the home page",
    "/shirts": "the shirt listing",
    "/cart": "his cart",
    "/checkout": "checkout",
    "/how-complicated": "the shirt designer",
    "/about": "the About Dan page",
    "/account": "his account page",
  };
  if (path.startsWith("/orders/")) return "He is looking at one of his orders.";
  return `He is on ${where[path] ?? "a store page"}.`;
}
