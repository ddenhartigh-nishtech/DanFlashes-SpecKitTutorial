/**
 * Recipes (007 R3). A recipe is a target score, a style and a seed. The server keeps it as a
 * readable key; links carry an opaque code made of letters only, so no score ever shows to a
 * shopper (FR-008), and a link survives a retuning because it holds the score, not a dial step.
 */
import type { ShirtStyle } from "@/lib/catalog/types";

export interface Recipe {
  score: number;
  style: ShirtStyle;
  seed: number;
}

export const RECIPE_VERSION = 1;
const MAX_SCORE = 2 ** 20 - 1;
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

// BigInt() calls rather than literals: the project's TypeScript target predates them.
const N = BigInt;
const ZERO = N(0);
const ONE = N(1);
const TWO = N(2);
const BASE = N(26);
const MASK = (ONE << N(64)) - ONE;
const MULT = N("0x9e3779b97f4a7c15"); // odd, so it has an inverse mod 2^64
const SHIFT = N(29);

/** The inverse of MULT mod 2^64 (Newton's iteration: each step doubles the correct bits). */
const INVERSE = (() => {
  let x = MULT;
  for (let i = 0; i < 6; i++) x = (x * (TWO - MULT * x)) & MASK;
  return x;
})();

/** Server-side only: `v1:<style>:<score>:<seed>` (shirts.recipe). */
export const recipeKey = ({ style, score, seed }: Recipe) =>
  `v${RECIPE_VERSION}:${style}:${score}:${seed}`;

const isRecipe = (r: Recipe) =>
  Number.isInteger(r.score) &&
  r.score >= 0 &&
  r.score <= MAX_SCORE &&
  Number.isInteger(r.seed) &&
  r.seed >= 0 &&
  r.seed < 2 ** 32 &&
  (r.style === "polo" || r.style === "button-down");

export function encodeRecipe(recipe: Recipe): string {
  if (!isRecipe(recipe)) throw new RangeError(`Not a recipe: ${JSON.stringify(recipe)}`);
  const packed =
    (N(recipe.seed) << N(25)) |
    (N(recipe.score) << N(5)) |
    (N(recipe.style === "polo" ? 0 : 1) << N(4)) |
    N(RECIPE_VERSION);
  let x = (packed * MULT) & MASK;
  x ^= x >> SHIFT;
  let code = "";
  do {
    code = LETTERS[Number(x % BASE)] + code;
    x /= BASE;
  } while (x > ZERO);
  return code;
}

export function decodeRecipe(code: string): Recipe | null {
  if (!/^[a-z]{1,14}$/.test(code)) return null;
  let y = ZERO;
  for (const ch of code) y = y * BASE + N(LETTERS.indexOf(ch));
  if (y > MASK) return null;
  const x = y ^ (y >> SHIFT) ^ (y >> N(58)); // undo x ^= x >> 29
  const packed = (x * INVERSE) & MASK;
  if (packed >> N(57) !== ZERO || (packed & N(15)) !== N(RECIPE_VERSION)) return null;
  const recipe: Recipe = {
    seed: Number((packed >> N(25)) & N(0xffffffff)),
    score: Number((packed >> N(5)) & N(MAX_SCORE)),
    style: (packed >> N(4)) & ONE ? "button-down" : "polo",
  };
  return isRecipe(recipe) && encodeRecipe(recipe) === code ? recipe : null;
}
