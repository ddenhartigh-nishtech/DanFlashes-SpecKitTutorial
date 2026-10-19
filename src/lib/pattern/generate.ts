/**
 * The pattern generator (007 R1): pure and deterministic. A recipe (a target score, a style and a
 * seed) always draws the same shirt, byte for byte, and the drawing's count is exactly the target:
 * layers first, then colors, then shapes whose points take up the rest. BLAND draws in muted
 * colors; everything above BLAND is loud.
 */
import { countPattern } from "@/lib/pattern/count";
import type { Recipe } from "@/lib/pattern/recipe";
import { mulberry32 } from "@/lib/pattern/rng";
import { BLAND_PALETTE, BODY, collar, LOUD_PALETTE, r1 } from "@/lib/pattern/silhouette";

export interface PatternShape {
  points: number;
  color: string;
  layer: number;
  svg: string;
}

export interface Pattern {
  fabric: string;
  layers: number;
  shapes: PatternShape[];
}

const clamp = (n: number) => Math.min(740, Math.max(60, n));

/** One shape of `points` points (1, 3, 4, or a zigzag of any other count). */
function shape(rand: () => number, points: number, color: string, size: number): string {
  const x = r1(90 + rand() * 620);
  const y = r1(80 + rand() * 660);
  const s = r1(size * (0.6 + rand() * 0.8));
  const rot = Math.floor(rand() * 360);
  if (points === 1) {
    return rand() < 0.5
      ? `<circle cx="${x}" cy="${y}" r="${s}" fill="${color}"/>`
      : `<ellipse cx="${x}" cy="${y}" rx="${s}" ry="${r1(s / 2.5)}" fill="${color}" transform="rotate(${rot} ${x} ${y})"/>`;
  }
  if (points === 3) {
    return `<polygon points="${x},${r1(y - s)} ${r1(x + s)},${r1(y + s)} ${r1(x - s)},${r1(y + s)}" fill="${color}" transform="rotate(${rot} ${x} ${y})"/>`;
  }
  if (points === 4) {
    return `<rect x="${x}" y="${y}" width="${r1(s * 1.6)}" height="${s}" fill="${color}" transform="rotate(${rot} ${x} ${y})"/>`;
  }
  // A zigzag: whole-number points keep the biggest patterns small (R13).
  let px = x;
  let py = y;
  const coords: string[] = [];
  for (let i = 0; i < points; i++) {
    coords.push(`${Math.round(px)},${Math.round(py)}`);
    px = clamp(px + (rand() - 0.5) * 2 * s);
    py = clamp(py + (rand() - 0.5) * 2 * s);
  }
  return `<polyline points="${coords.join(" ")}" fill="none" stroke="${color}" stroke-width="${r1(Math.max(1, s / 4))}" stroke-linejoin="miter"/>`;
}

export function buildPattern(recipe: Recipe, { bland }: { bland: boolean }): Pattern {
  const { score: target, style, seed } = recipe;
  if (!Number.isInteger(target) || target < 0) {
    throw new RangeError(`A pattern needs a whole-number score, got ${target}`);
  }
  const rand = mulberry32(
    (seed ^ Math.imul(target, 0x9e3779b1) ^ (style === "polo" ? 0 : 0x5bd1e995)) >>> 0,
  );
  const palette: readonly string[] = bland ? BLAND_PALETTE : LOUD_PALETTE;

  // Layers first, then colors, then the points that make up the rest: exactly the target.
  const layers = 1 + Math.min(20, Math.floor(target / 60));
  const rest = target - 10 * (layers - 1);
  const colorCount = rest > 0 ? 1 + Math.min(palette.length - 2, Math.floor(rest / 25)) : 0;
  let points = rest - 5 * Math.max(0, colorCount - 1);

  const start = Math.floor(rand() * palette.length);
  const stride = bland ? 2 : 5; // coprime with the palette size, so the colors are all different
  const fabric = palette[start];
  const colors = Array.from(
    { length: colorCount },
    (_, i) => palette[(start + (i + 1) * stride) % palette.length],
  );

  // The more complicated, the smaller and more tangled: past a point the shapes stop being shapes.
  const longest = Math.min(400, 4 + Math.floor(target / 50));
  const zigzags = Math.min(0.9, 0.2 + target / 2000);
  const shrink = Math.max(0.25, 1 / (1 + target / 800));

  const shapes: PatternShape[] = [];
  while (points > 0) {
    const index = shapes.length;
    let wanted: number;
    if (rand() < zigzags) {
      wanted = 2 + Math.floor(rand() * Math.max(1, longest - 1));
    } else {
      wanted = [1, 1, 3, 4][Math.floor(rand() * 4)];
    }
    const take = Math.min(wanted, points); // the last shape takes exactly what's left
    const color = index < colorCount ? colors[index] : colors[Math.floor(rand() * colorCount)];
    const layer = index % layers;
    const size = (14 + rand() * 46) * shrink * (1 / (1 + layer * 0.45));
    shapes.push({ points: take, color, layer, svg: shape(rand, take, color, size) });
    points -= take;
  }
  return { fabric, layers, shapes };
}

export function patternSvg(pattern: Pattern, style: Recipe["style"]): string {
  const groups = Array.from({ length: pattern.layers }, (_, layer) => {
    const body = pattern.shapes
      .filter((s) => s.layer === layer)
      .map((s) => s.svg)
      .join("");
    return `<g opacity="${r1(1 - layer * 0.04)}">${body}</g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
<defs><clipPath id="body"><path d="${BODY}"/></clipPath></defs>
<rect width="800" height="800" fill="#111"/>
<g clip-path="url(#body)"><rect width="800" height="800" fill="${pattern.fabric}"/>${groups}</g>
<path d="${BODY}" fill="none" stroke="#111" stroke-width="6" stroke-linejoin="round"/>
${collar(style)}
</svg>
`;
}

/** A recipe's art and its count (always the recipe's score). */
export function generate(
  recipe: Recipe,
  options: { bland: boolean },
): { svg: string; count: number } {
  const pattern = buildPattern(recipe, options);
  return { svg: patternSvg(pattern, recipe.style), count: countPattern(pattern) };
}
