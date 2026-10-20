/**
 * The shirt itself (shared by the generator, 007, and the seed art script): the store's two
 * palettes, the body every pattern is clipped to, and the two collars.
 */
import type { ShirtStyle } from "@/lib/catalog/types";

/** Loud: everything above BLAND (constitution III). */
export const LOUD_PALETTE = [
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
] as const;

/** Muted, earth-toned: BLAND only (constitution III). */
export const BLAND_PALETTE = ["#C8B89A", "#B5A88F", "#D9CFBF", "#9E9585", "#E4DDD0"] as const;

/** The shirt's body, in the 800 × 800 art box. Every pattern is clipped to it. */
export const BODY =
  "M250 120 L330 88 Q400 132 470 88 L550 120 L705 225 L640 338 L572 296 L572 728 L228 728 L228 296 L160 338 L95 225 Z";

export function collar(style: ShirtStyle): string {
  return style === "polo"
    ? `<path d="M330 88 L400 168 L362 96 Z M470 88 L400 168 L438 96 Z" fill="#FFFFFF" stroke="#111" stroke-width="4"/>
       <rect x="388" y="150" width="24" height="120" fill="#FFFFFF" stroke="#111" stroke-width="3"/>
       ${[180, 215, 250].map((y) => `<circle cx="400" cy="${y}" r="6" fill="#111"/>`).join("")}`
    : `<path d="M330 88 L398 205 L342 140 Z M470 88 L402 205 L458 140 Z" fill="#FFFFFF" stroke="#111" stroke-width="4"/>
       <rect x="389" y="150" width="22" height="578" fill="none" stroke="#111" stroke-width="3"/>
       ${[220, 300, 380, 460, 540, 620, 700].map((y) => `<circle cx="400" cy="${y}" r="6" fill="#111"/>`).join("")}`;
}

/** One decimal place: every number in the art, so the same recipe is byte-identical. */
export const r1 = (n: number) => Math.round(n * 10) / 10;
