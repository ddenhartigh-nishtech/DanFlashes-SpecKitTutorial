/**
 * "Make it mine" (007 FR-014, R5): the dial setting becomes the one real shirt it describes, and
 * the shopper goes to its own page to buy it like any shirt. Anyone can press it; the recipe is
 * re-drawn here, never trusted from the browser.
 */
import { copy } from "@/lib/copy";
import { getSettings } from "@/lib/data/settings";
import type { Db } from "@/lib/db/client";
import { materialize } from "@/lib/pattern/materialize";
import { decodeRecipe } from "@/lib/pattern/recipe";

export type MakeItMineState = { ok: true; slug: string } | { ok: false; message: string };

const refused: MakeItMineState = { ok: false, message: copy.dial.refused };

export function makeItMineCore(db: Db, form: FormData): MakeItMineState {
  if (!getSettings(db).patternGenerator) return refused;
  const code = form.get("code");
  const recipe = typeof code === "string" ? decodeRecipe(code) : null;
  if (!recipe) return refused;
  const made = materialize(db, recipe, { origin: "dial" });
  return made.ok ? { ok: true, slug: made.slug } : refused;
}
