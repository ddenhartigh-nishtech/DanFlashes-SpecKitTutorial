/**
 * Generated shirts' names (007 R10): picked from Dan's word banks by the recipe, so the same recipe
 * always has the same name. Words only, never a digit, so a name can't carry the score (FR-008). A
 * taken name gets a Roman numeral.
 */
import { copy } from "@/lib/copy";
import type { Recipe } from "@/lib/pattern/recipe";
import { mulberry32 } from "@/lib/pattern/rng";

const pick = <T>(rand: () => number, list: readonly T[]) => list[Math.floor(rand() * list.length)];

export function nameFor(recipe: Recipe, bland: boolean): string {
  const rand = mulberry32((recipe.seed ^ Math.imul(recipe.score + 1, 0x85ebca6b)) >>> 0);
  if (bland) {
    const b = copy.dial.names.bland;
    return `${pick(rand, b.adjectives)} ${pick(rand, b.nouns)}`;
  }
  const l = copy.dial.names.loud;
  return [pick(rand, l.adjectives), pick(rand, l.nouns), pick(rand, l.suffixes)]
    .filter(Boolean)
    .join(" ");
}

function roman(n: number): string {
  const table: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  for (const [value, numeral] of table) {
    while (n >= value) {
      out += numeral;
      n -= value;
    }
  }
  return out;
}

/** The name itself, or the first "Name II", "Name III", … that isn't taken. */
export function uniqueName(base: string, taken: (name: string) => boolean): string {
  if (!taken(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} ${roman(n)}`;
    if (!taken(candidate)) return candidate;
  }
}

/** A URL name: the name in kebab case, then five letters of the recipe code. */
export function slugFor(name: string, code: string): string {
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${words}-${code.slice(0, 5)}`;
}
