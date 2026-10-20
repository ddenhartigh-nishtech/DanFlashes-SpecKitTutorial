/**
 * "Make it mine" (007 FR-014, R5, R14): the dial setting becomes the one real shirt it describes,
 * made to order for whoever pressed it, and he goes to its own page to buy it. It needs an
 * account: a guest is sent to sign in and back to the same setting, and nothing is made. The
 * recipe is re-drawn here, never trusted from the browser.
 */
import { copy } from "@/lib/copy";
import { getSettings } from "@/lib/data/settings";
import type { Db } from "@/lib/db/client";
import { materialize } from "@/lib/pattern/materialize";
import { decodeRecipe } from "@/lib/pattern/recipe";

export type MakeItMineState =
  | { ok: true; slug: string }
  | { ok: false; message: string }
  /** A guest: where to come back to once he's signed in. */
  | { ok: false; signIn: string };

const refused: MakeItMineState = { ok: false, message: copy.dial.refused };

export function makeItMineCore(db: Db, form: FormData, userId: number | null): MakeItMineState {
  if (!getSettings(db).patternGenerator) return refused;
  const code = form.get("code");
  const recipe = typeof code === "string" ? decodeRecipe(code) : null;
  if (!recipe) return refused;
  if (userId === null) return { ok: false, signIn: `/how-complicated?r=${code}` };
  const made = materialize(db, recipe, { origin: "dial", makerUserId: userId });
  return made.ok ? { ok: true, slug: made.slug } : refused;
}
