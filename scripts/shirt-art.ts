/**
 * Deterministic placeholder shirt art: a polo or button-down silhouette filled with a pattern
 * whose density, palette size, and layer count grow with complexity. Same slug + complexity →
 * byte-identical SVG, so regenerating never churns git.
 */

const LOUD = [
  "#FF2D95",
  "#00E5FF",
  "#FFE600",
  "#7A00FF",
  "#00FF85",
  "#FF5A00",
  "#FF00F5",
  "#00B3FF",
  "#B6FF00",
  "#FF1744",
  "#FFC400",
  "#1DE9B6",
  "#D500F9",
  "#2979FF",
  "#FF6D00",
  "#76FF03",
];
const BLAND = ["#C8B89A", "#B5A88F", "#D9CFBF", "#9E9585", "#E4DDD0"];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

const BODY =
  "M250 120 L330 88 Q400 132 470 88 L550 120 L705 225 L640 338 L572 296 L572 728 L228 728 L228 296 L160 338 L95 225 Z";

function collar(style: "polo" | "button-down"): string {
  return style === "polo"
    ? `<path d="M330 88 L400 168 L362 96 Z M470 88 L400 168 L438 96 Z" fill="#FFFFFF" stroke="#111" stroke-width="4"/>
       <rect x="388" y="150" width="24" height="120" fill="#FFFFFF" stroke="#111" stroke-width="3"/>
       ${[180, 215, 250].map((y) => `<circle cx="400" cy="${y}" r="6" fill="#111"/>`).join("")}`
    : `<path d="M330 88 L398 205 L342 140 Z M470 88 L402 205 L458 140 Z" fill="#FFFFFF" stroke="#111" stroke-width="4"/>
       <rect x="389" y="150" width="22" height="578" fill="none" stroke="#111" stroke-width="3"/>
       ${[220, 300, 380, 460, 540, 620, 700].map((y) => `<circle cx="400" cy="${y}" r="6" fill="#111"/>`).join("")}`;
}

function shape(rand: () => number, colors: string[], scale: number): string {
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
