/**
 * What Dan's generator shows (007 FR-019): the art's code, the counted score, the tier and MSRP, a
 * name to keep or change, and whether the recipe is already a shirt. Owner-only: it carries the
 * score, which no shopper page may show (constitution II).
 */
import { eq } from "drizzle-orm";
import { isBlandTier, tierOf } from "@/lib/catalog/tiers";
import type { Issue } from "@/lib/catalog/validate";
import { copy } from "@/lib/copy";
import { getSettings } from "@/lib/data/settings";
import type { TierBadge } from "@/lib/data/shirts";
import { listTiers } from "@/lib/data/tiers";
import type { Db } from "@/lib/db/client";
import { shirts } from "@/lib/db/schema";
import type { Usd } from "@/lib/money";
import { countPattern } from "@/lib/pattern/count";
import { maxDialScore } from "@/lib/pattern/dial";
import { badge, parseSeed, parseStyle } from "@/lib/pattern/dial-view";
import { buildPattern } from "@/lib/pattern/generate";
import { nameFor } from "@/lib/pattern/names";
import { encodeRecipe, recipeKey, type Recipe } from "@/lib/pattern/recipe";
import { msrpUsd } from "@/lib/pricing/msrp";

const g = copy.console.generator;

export interface RecipeInput {
  score?: string;
  style?: string;
  seed?: string;
}

export type RecipeProblem = "empty" | "range" | "unpriceable" | "style" | "seed";

export type RecipeRead =
  { ok: true; recipe: Recipe } | { ok: false; reason: RecipeProblem; issues: Issue[] };

/**
 * A recipe from what Dan typed: a score from 0 to the dial's top (010 FR-011); polo and seed 1
 * unless he said otherwise.
 */
export function readRecipe(input: RecipeInput): RecipeRead {
  const problems: { reason: RecipeProblem; issue: Issue }[] = [];
  const raw = input.score?.trim() ?? "";
  const score = /^\d+$/.test(raw) ? Number(raw) : null;
  if (score === null) {
    problems.push({
      reason: raw === "" ? "empty" : "range",
      issue: { field: "score", message: g.scoreRange(maxDialScore()) },
    });
  } else if (score > maxDialScore()) {
    // The dial's joke, at the dial's top (010 FR-011).
    problems.push({ reason: "unpriceable", issue: { field: "score", message: g.beyond } });
  }
  const style = input.style ? parseStyle(input.style) : "polo";
  if (!style) problems.push({ reason: "style", issue: { field: "style", message: g.badStyle } });
  const seed = input.seed ? parseSeed(input.seed) : 1;
  if (seed === null)
    problems.push({ reason: "seed", issue: { field: "seed", message: g.badSeed } });

  if (problems.length || score === null || !style || seed === null) {
    return { ok: false, reason: problems[0].reason, issues: problems.map((p) => p.issue) };
  }
  return { ok: true, recipe: { score, style, seed } };
}

/** The shirt a recipe already is, if it is one. */
export function shirtForRecipe(db: Db, recipe: Recipe) {
  return (
    db
      .select({ id: shirts.id, name: shirts.name })
      .from(shirts)
      .where(eq(shirts.recipe, recipeKey(recipe)))
      .get() ?? null
  );
}

export type GeneratorPreview =
  | {
      ok: true;
      recipe: Recipe;
      /** For the console's art route. */
      code: string;
      /** Counted from the pattern itself: always the target (007 R1). */
      count: number;
      tier: TierBadge;
      msrpUsd: Usd;
      /** Dan's word banks' suggestion; he can change it. */
      name: string;
      made: { id: number; name: string } | null;
      maxScore: number;
    }
  | { ok: false; reason: RecipeProblem; message: string; maxScore: number };

export function generatorPreview(db: Db, input: RecipeInput): GeneratorPreview {
  const { msrp } = getSettings(db);
  const maxScore = maxDialScore();
  const read = readRecipe(input);
  if (!read.ok) {
    const message = read.reason === "empty" ? g.empty : read.issues[0].message;
    return { ok: false, reason: read.reason, message, maxScore };
  }
  const { recipe } = read;
  const tier = tierOf(recipe.score, listTiers(db));
  const bland = isBlandTier(tier);
  return {
    ok: true,
    recipe,
    code: encodeRecipe(recipe),
    count: countPattern(buildPattern(recipe, { bland })),
    tier: badge(tier),
    msrpUsd: msrpUsd(recipe.score, msrp),
    name: nameFor(recipe, bland),
    made: shirtForRecipe(db, recipe),
    maxScore,
  };
}
