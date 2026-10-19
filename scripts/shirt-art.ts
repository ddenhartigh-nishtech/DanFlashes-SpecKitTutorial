/**
 * Deterministic placeholder shirt art: a polo or button-down silhouette filled with a pattern
 * whose density, palette size, and layer count grow with complexity. Same slug + complexity →
 * byte-identical SVG, so regenerating never churns git. The palettes, the body and the collars are
 * shared with the pattern generator (007).
 */
import { mulberry32 as rng } from "@/lib/pattern/rng";
import { BLAND_PALETTE, BODY, collar, LOUD_PALETTE, r1 } from "@/lib/pattern/silhouette";

const LOUD: readonly string[] = LOUD_PALETTE;
const BLAND: readonly string[] = BLAND_PALETTE;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shape(rand: () => number, colors: readonly string[], scale: number): string {
  const x = r1(90 + rand() * 620);
  const y = r1(80 + rand() * 660);
  const s = r1((14 + rand() * 46) * scale);
  const fill = colors[Math.floor(rand() * colors.length)];
  const rot = Math.floor(rand() * 360);
  switch (Math.floor(rand() * 6)) {
    case 0:
      return `<circle cx="${x}" cy="${y}" r="${s}" fill="${fill}"/>`;
    case 1:
      return `<rect x="${x}" y="${y}" width="${s * 1.6}" height="${s}" fill="${fill}" transform="rotate(${rot} ${x} ${y})"/>`;
    case 2:
      return `<polygon points="${x},${r1(y - s)} ${r1(x + s)},${r1(y + s)} ${r1(x - s)},${r1(y + s)}" fill="${fill}" transform="rotate(${rot} ${x} ${y})"/>`;
    case 3: {
      const pts = Array.from(
        { length: 6 },
        (_, i) => `${r1(x + i * s * 0.5)},${i % 2 ? r1(y - s * 0.6) : r1(y + s * 0.6)}`,
      );
      return `<polyline points="${pts.join(" ")}" fill="none" stroke="${fill}" stroke-width="${r1(s / 4)}" stroke-linejoin="miter"/>`;
    }
    case 4:
      return `<path d="M${x} ${y} q ${s} ${-s} ${s * 2} 0 t ${s * 2} 0" fill="none" stroke="${fill}" stroke-width="${r1(s / 5)}" stroke-linecap="round"/>`;
    default:
      return `<ellipse cx="${x}" cy="${y}" rx="${s}" ry="${r1(s / 2.5)}" fill="${fill}" transform="rotate(${rot} ${x} ${y})"/>`;
  }
}

export function shirtSvg(slug: string, complexity: number, style: "polo" | "button-down"): string {
  const rand = rng(hash(slug));
  const bland = complexity < 10;
  const palette = bland ? BLAND : LOUD;
  const colorCount = bland ? 2 : Math.min(palette.length, 3 + Math.floor(complexity / 8));
  const start = Math.floor(rand() * palette.length);
  const colors = Array.from(
    { length: colorCount },
    (_, i) => palette[(start + i * 5) % palette.length],
  );
  const layers = bland ? 1 : 1 + Math.min(3, Math.floor(complexity / 25));
  const perLayer = bland ? 6 : 12 + Math.min(complexity, 70) * 2;

  const pattern = Array.from({ length: layers }, (_, layer) => {
    const scale = 1 / (1 + layer * 0.45);
    const shapes = Array.from({ length: perLayer }, () => shape(rand, colors, scale)).join("");
    return `<g opacity="${r1(1 - layer * 0.08)}">${shapes}</g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
<defs><clipPath id="body"><path d="${BODY}"/></clipPath></defs>
<rect width="800" height="800" fill="#111"/>
<g clip-path="url(#body)"><rect width="800" height="800" fill="${colors[colors.length - 1]}"/>${pattern}</g>
<path d="${BODY}" fill="none" stroke="#111" stroke-width="6" stroke-linejoin="round"/>
${collar(style)}
</svg>
`;
}

export function placeholderSvg(): string {
  const stripes = Array.from(
    { length: 14 },
    (_, i) =>
      `<rect x="${i * 60 - 200}" y="-100" width="30" height="1100" fill="${LOUD[i % LOUD.length]}" transform="rotate(25 400 400)"/>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
<rect width="800" height="800" fill="#111"/>${stripes}
<rect x="80" y="300" width="640" height="200" fill="#111" stroke="#FFE600" stroke-width="8"/>
<text x="400" y="385" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="54" fill="#FFE600">IMAGE TOO</text>
<text x="400" y="455" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="54" fill="#FF2D95">COMPLICATED TO LOAD</text>
</svg>
`;
}
