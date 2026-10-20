/**
 * The pattern generator (007 R1): pure and deterministic. A recipe (a target score, a style and a
 * seed) always draws the same shirt, byte for byte, and the drawing's count is exactly the target:
 * layers first, then colors, then shapes whose points take up the rest, ten drawn points to a score
 * point. BLAND draws in muted colors; everything above BLAND is loud.
 */
import { countPattern, POINTS_PER_SCORE } from "@/lib/pattern/count";
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

/**
 * One shape of exactly `points` points: 1 is a dot or an ellipse, 3 a triangle or a wave, 4 a
 * rectangle, and anything else a zigzag, one point a corner. Short zigzags march like the seed
 * shirts'; long ones wander by `roam`, so a busier score covers more of the shirt.
 */
function shape(rand: () => number, points: number, color: string, size: number, roam: number) {
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
    return rand() < 0.5
      ? `<polygon points="${x},${r1(y - s)} ${r1(x + s)},${r1(y + s)} ${r1(x - s)},${r1(y + s)}" fill="${color}" transform="rotate(${rot} ${x} ${y})"/>`
      : `<path d="M${x} ${y} q ${s} ${-s} ${r1(s * 2)} 0 t ${r1(s * 2)} 0" fill="none" stroke="${color}" stroke-width="${r1(Math.max(2, s / 5))}" stroke-linecap="round"/>`;
  }
  if (points === 4) {
    return `<rect x="${x}" y="${y}" width="${r1(s * 1.6)}" height="${s}" fill="${color}" transform="rotate(${rot} ${x} ${y})"/>`;
  }
  // Whole-number corners keep the biggest patterns small (R13).
  const step = Math.max(s * 0.5, roam);
  let px = x;
  let py = y;
  let heading = rand() * Math.PI * 2;
  const coords: string[] = [];
  for (let i = 0; i < points; i++) {
    coords.push(`${Math.round(px)},${Math.round(py)}`);
    heading += (rand() - 0.5) * 2.2;
    px = clamp(px + Math.cos(heading) * step * (i % 2 ? 1 : 0.8));
    py = clamp(py + Math.sin(heading) * step * (i % 2 ? 0.8 : 1));
  }
  // Some short ones are filled; big filled tangles would wash the shirt into one color (R1).
  return points >= 8 && points <= 40 && rand() < 0.3
    ? `<polygon points="${coords.join(" ")}" fill="${color}" fill-rule="evenodd"/>`
    : `<polyline points="${coords.join(" ")}" fill="none" stroke="${color}" stroke-width="${r1(Math.max(2, s / 4, roam / 6))}" stroke-linejoin="miter"/>`;
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
  let points = POINTS_PER_SCORE * (rest - 5 * Math.max(0, colorCount - 1));

  const start = Math.floor(rand() * palette.length);
  const stride = bland ? 2 : 5; // coprime with the palette size, so the colors are all different
  const fabric = palette[start];
  const colors = Array.from(
    { length: colorCount },
    (_, i) => palette[(start + (i + 1) * stride) % palette.length],
  );

  // Seed-shirt shapes up to about 150; past that, zigzags take over, longer and wandering further.
  const zigzags = Math.min(0.85, 0.15 + target / 1500);
  const longest = Math.min(400, 6 + Math.floor(target / 25));
  const roam = Math.min(60, target / 30);

  const shapes: PatternShape[] = [];
  while (points > 0) {
    const index = shapes.length;
    const wanted =
      rand() < zigzags
        ? 5 + Math.floor(rand() * Math.max(1, longest - 4))
        : [1, 1, 3, 3, 4][Math.floor(rand() * 5)];
    // There's no two-point shape: a 2 left over becomes two dots.
    const take = Math.min(wanted, points) === 2 ? 1 : Math.min(wanted, points);
    const color = index < colorCount ? colors[index] : colors[Math.floor(rand() * colorCount)];
    const layer = index % layers;
    const size = (14 + rand() * 46) / (1 + layer * 0.12);
    shapes.push({ points: take, color, layer, svg: shape(rand, take, color, size, roam) });
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
    // Nearly opaque all the way up: faint layers turned the busiest shirts grey (R1).
    return `<g opacity="${r1(1 - layer * 0.01)}">${body}</g>`;
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
