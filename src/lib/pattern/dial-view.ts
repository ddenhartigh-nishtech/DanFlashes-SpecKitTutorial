/**
 * The dial as the browser sees it (007 R4): 102 steps of opaque recipe codes, tier badges and exact
 * prices, worked out here on the server. No score ever goes in it (FR-008). A setting that's
 * already a shirt shows that shirt, priced as it is now (Dan's re-score included).
 */
import { and, eq, inArray } from "drizzle-orm";
import { isOneOfAKind } from "@/lib/catalog/one-of-a-kind";
import { isBlandTier, tierOf } from "@/lib/catalog/tiers";
import type { ShirtStyle, Tier } from "@/lib/catalog/types";
import { getSettings } from "@/lib/data/settings";
import type { TierBadge } from "@/lib/data/shirts";
import { listTiers } from "@/lib/data/tiers";
import type { Db } from "@/lib/db/client";
import { media, shirtImages, shirts } from "@/lib/db/schema";
import { readUpload, UPLOAD_PREFIX } from "@/lib/admin/uploads";
import type { Usd } from "@/lib/money";
import { BEYOND, DIAL_STEPS, maxDialScore, scoreAtStep } from "@/lib/pattern/dial";
import { generate } from "@/lib/pattern/generate";
import { decodeRecipe, encodeRecipe, recipeKey, type Recipe } from "@/lib/pattern/recipe";
import { msrpUsd } from "@/lib/pricing/msrp";
import { resolvePrice } from "@/lib/pricing/resolve";

export const DEFAULT_STEP = 20;

export interface DialStep {
  /** The recipe's opaque code; null at BEYOND. */
  code: string | null;
  tier: TierBadge;
  /** Exact; null at BEYOND, where it's too complicated to price. */
  priceUsd: Usd | null;
  /**
   * This setting is already a shirt: its page, its name, its price as it is now, whether it's the
   * viewer's own, and whether it's one of a kind and someone else's (007 R14).
   */
  made: { slug: string; name: string; priceUsd: Usd; mine: boolean; taken: boolean } | null;
}

export interface DialView {
  steps: DialStep[];
  current: number;
  style: ShirtStyle;
  seed: number;
}

export const badge = (tier: Tier): TierBadge => ({
  id: tier.id,
  name: tier.name,
  tagline: tier.tagline,
  badgeBgColor: tier.badgeBgColor,
  badgeTextColor: tier.badgeTextColor,
  isBland: isBlandTier(tier),
});

export const parseSeed = (raw: string | undefined) =>
  raw !== undefined && /^\d{1,10}$/.test(raw) && Number(raw) < 2 ** 32 ? Number(raw) : null;
export const parseStyle = (raw: string | undefined): ShirtStyle | null =>
  raw === "polo" || raw === "button-down" ? raw : null;

export function buildDial(
  db: Db,
  query: { r?: string; seed?: string; style?: string },
  viewerId: number | null = null,
): DialView | null {
  const settings = getSettings(db);
  if (!settings.patternGenerator) return null;
  const tiers = listTiers(db);
  const maxDial = maxDialScore(settings.msrp);

  const linked = query.r ? decodeRecipe(query.r) : null;
  const style = parseStyle(query.style) ?? linked?.style ?? "polo";
  const seed = parseSeed(query.seed) ?? linked?.seed ?? 1;
  const exact = linked && linked.style === style && linked.seed === seed && linked.score <= maxDial;

  const scores = Array.from({ length: BEYOND }, (_, step) => scoreAtStep(step, maxDial)!);
  let current = DEFAULT_STEP;
  if (linked) {
    current = linked.score > maxDial ? BEYOND : nearest(scores, linked.score);
  }
  const recipes: (Recipe | null)[] = Array.from({ length: DIAL_STEPS }, (_, step) =>
    step === BEYOND ? null : { score: scores[step], style, seed },
  );
  if (exact && linked) recipes[current] = linked;

  const made = madeShirts(
    db,
    recipes.filter((r): r is Recipe => r !== null).map(recipeKey),
    settings.msrp,
    viewerId,
  );
  const top = tierOf(maxDial, tiers);

  return {
    current,
    style,
    seed,
    steps: recipes.map((recipe) =>
      recipe === null
        ? { code: null, tier: badge(top), priceUsd: null, made: null }
        : {
            code: encodeRecipe(recipe),
            tier: badge(tierOf(recipe.score, tiers)),
            priceUsd: msrpUsd(recipe.score, settings.msrp),
            made: made.get(recipeKey(recipe)) ?? null,
          },
    ),
  };
}

/** The step whose score is closest (ties go to the lower step). */
function nearest(scores: number[], score: number): number {
  let best = 0;
  scores.forEach((s, i) => {
    if (Math.abs(s - score) < Math.abs(scores[best] - score)) best = i;
  });
  return best;
}

function madeShirts(
  db: Db,
  keys: string[],
  msrp: Parameters<typeof msrpUsd>[1],
  viewerId: number | null,
) {
  const rows = keys.length
    ? db
        .select({
          recipe: shirts.recipe,
          slug: shirts.slug,
          name: shirts.name,
          complexity: shirts.complexity,
          finalPriceUsd: shirts.finalPriceUsd,
          origin: shirts.origin,
          listed: shirts.listed,
          makerUserId: shirts.makerUserId,
        })
        .from(shirts)
        .where(inArray(shirts.recipe, keys))
        .all()
    : [];
  return new Map(
    rows.map((row) => {
      const mine = viewerId !== null && row.makerUserId === viewerId;
      return [
        row.recipe!,
        {
          slug: row.slug,
          name: row.name,
          priceUsd: resolvePrice(row, msrp).finalPriceUsd,
          mine,
          taken: isOneOfAKind(row) && !mine,
        },
      ];
    }),
  );
}

/**
 * A recipe's art (the dial's preview, and Dan's): a made shirt's stored art, or the generator's.
 * Null for anything that isn't a recipe, past the top, or (in the store) while the switch is off.
 */
export function artForCode(
  db: Db,
  code: string,
  { ignoreSwitch = false }: { ignoreSwitch?: boolean } = {},
): Uint8Array | null {
  const settings = getSettings(db);
  if (!ignoreSwitch && !settings.patternGenerator) return null;
  const recipe = decodeRecipe(code);
  if (!recipe || recipe.score > maxDialScore(settings.msrp)) return null;

  const stored = db
    .select({ key: media.key })
    .from(shirts)
    .innerJoin(shirtImages, and(eq(shirtImages.shirtId, shirts.id), eq(shirtImages.position, 0)))
    .innerJoin(media, eq(media.id, shirtImages.mediaId))
    .where(eq(shirts.recipe, recipeKey(recipe)))
    .get();
  if (stored?.key.startsWith(UPLOAD_PREFIX)) {
    const bytes = readUpload(stored.key.slice(UPLOAD_PREFIX.length));
    if (bytes) return new Uint8Array(bytes);
  }
  const bland = isBlandTier(tierOf(recipe.score, listTiers(db)));
  return new TextEncoder().encode(generate(recipe, { bland }).svg);
}
