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
const MASK = (1n << 64n) - 1n;
const MULT = 0x9e3779b97f4a7c15n; // odd, so it has an inverse mod 2^64
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

/** The inverse of MULT mod 2^64 (Newton's iteration: each step doubles the correct bits). */
const INVERSE = (() => {
  let x = MULT;
  for (let i = 0; i < 6; i++) x = (x * (2n - MULT * x)) & MASK;
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
    (BigInt(recipe.seed) << 25n) |
    (BigInt(recipe.score) << 5n) |
    (BigInt(recipe.style === "polo" ? 0 : 1) << 4n) |
    BigInt(RECIPE_VERSION);
  let x = (packed * MULT) & MASK;
  x ^= x >> 29n;
  let code = "";
  do {
    code = LETTERS[Number(x % 26n)] + code;
    x /= 26n;
  } while (x > 0n);
  return code;
}

export function decodeRecipe(code: string): Recipe | null {
  if (!/^[a-z]{1,14}$/.test(code)) return null;
  let y = 0n;
  for (const ch of code) y = y * 26n + BigInt(LETTERS.indexOf(ch));
  if (y > MASK) return null;
  const x = y ^ (y >> 29n) ^ (y >> 58n); // undo x ^= x >> 29
  const packed = (x * INVERSE) & MASK;
  if (packed >> 57n !== 0n || (packed & 0xfn) !== BigInt(RECIPE_VERSION)) return null;
  const recipe: Recipe = {
    seed: Number((packed >> 25n) & 0xffffffffn),
    score: Number((packed >> 5n) & BigInt(MAX_SCORE)),
    style: (packed >> 4n) & 1n ? "button-down" : "polo",
  };
  return isRecipe(recipe) && encodeRecipe(recipe) === code ? recipe : null;
}
