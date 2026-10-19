/**
 * The only way a generated shirt comes to exist (007 R6): a recipe becomes the one real catalog
 * shirt it describes, with its art stored like an upload, its counted score and its MSRP. The same
 * recipe always finds the same shirt, and a shirt that would break a catalog rule is never made.
 */
import { eq } from "drizzle-orm";
import { isBlandTier, tierOf } from "@/lib/catalog/tiers";
import { validateShirt, type Issue } from "@/lib/catalog/validate";
import { copy } from "@/lib/copy";
import { getSettings } from "@/lib/data/settings";
import { listTiers } from "@/lib/data/tiers";
import type { Db } from "@/lib/db/client";
import { media, shirtImages, shirts } from "@/lib/db/schema";
import { removeUpload, writeUpload } from "@/lib/admin/uploads";
import { maxDialScore } from "@/lib/pattern/dial";
import { generate } from "@/lib/pattern/generate";
import { nameFor, slugFor, uniqueName } from "@/lib/pattern/names";
import { encodeRecipe, recipeKey, type Recipe } from "@/lib/pattern/recipe";

export type Origin = "owner" | "dial";

export type MaterializeResult =
  | { ok: true; shirtId: number; slug: string; created: boolean }
  | { ok: false; code: "BEYOND" }
  | { ok: false; code: "RULE"; issues: Issue[] };

function findByRecipe(db: Db, key: string) {
  return db
    .select({ id: shirts.id, slug: shirts.slug })
    .from(shirts)
    .where(eq(shirts.recipe, key))
    .get();
}

const taken = (db: Db, column: typeof shirts.name | typeof shirts.slug) => (value: string) =>
  Boolean(db.select({ id: shirts.id }).from(shirts).where(eq(column, value)).get());

export function materialize(
  db: Db,
  recipe: Recipe,
  { origin, name }: { origin: Origin; name?: string },
): MaterializeResult {
  const key = recipeKey(recipe);
  const existing = findByRecipe(db, key);
  if (existing) return { ok: true, shirtId: existing.id, slug: existing.slug, created: false };

  const settings = getSettings(db);
  if (recipe.score > maxDialScore(settings.msrp)) return { ok: false, code: "BEYOND" };

  const tiers = listTiers(db);
  const bland = isBlandTier(tierOf(recipe.score, tiers));
  const finalName = uniqueName(name?.trim() || nameFor(recipe, bland), taken(db, shirts.name));
  const code = encodeRecipe(recipe);
  let slug = slugFor(finalName, code);
  for (let extra = 6; taken(db, shirts.slug)(slug); extra++) {
    slug = slugFor(finalName, code.slice(0, extra) + (extra > code.length ? extra : ""));
  }
  const draft = {
    slug,
    name: finalName,
    style: recipe.style,
    complexity: recipe.score,
    finalPriceUsd: null,
    description: bland ? copy.dial.description.bland : copy.dial.description.loud,
    status: origin === "dial" ? ("active" as const) : ("inactive" as const),
    featured: false,
  };
  const issues = validateShirt(draft, { tiers, msrp: settings.msrp, imageCount: 1 });
  if (issues.length) return { ok: false, code: "RULE", issues };

  // The file first, under a fresh name; then the rows, all at once. No rows, no file.
  const fileKey = writeUpload(new TextEncoder().encode(generate(recipe, { bland }).svg), "svg");
  try {
    const shirtId = db.transaction(() => {
      const picture = db
        .insert(media)
        .values({ key: fileKey, alt: copy.dial.alt(finalName), kind: "shirt" })
        .returning({ id: media.id })
        .get();
      const made = db
        .insert(shirts)
        .values({ ...draft, origin, recipe: key, listed: origin !== "dial" })
        .returning({ id: shirts.id })
        .get();
      db.insert(shirtImages).values({ shirtId: made.id, mediaId: picture.id, position: 0 }).run();
      return made.id;
    });
    return { ok: true, shirtId, slug, created: true };
  } catch (error) {
    removeUpload(fileKey);
    const winner = findByRecipe(db, key); // someone made the same recipe a moment earlier
    if (winner) return { ok: true, shirtId: winner.id, slug: winner.slug, created: false };
    throw error;
  }
}
