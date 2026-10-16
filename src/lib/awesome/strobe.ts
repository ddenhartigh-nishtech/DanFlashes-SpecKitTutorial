/**
 * The strobe (006 R7, analysis I1). It cycles strobe-only variables that backgrounds and borders
 * read, never a theme token that text reads, so no text can end up the color of its own backing.
 * Each palette names theme colors (`--color-<name>`), and src/app/globals.css steps through them in
 * this order; a unit test holds the CSS to these constants.
 */

/** Every color holds this long: at most 2.5 changes a second, under FR-011's 3. */
export const STROBE_HOLD_MS = 400;

/** Behind ink text on paper. No hot pink (hot-pink text sits on paper) and no ultraviolet. */
export const PAPER_PALETTE = [
  "highlighter",
  "acid",
  "electric-cyan",
  "safety-orange",
  "paper",
] as const;

/** Behind paper and highlighter text (heading and label backings): darks only. */
export const DARK_PALETTE = ["ink", "ultraviolet"] as const;

/** Borders: no text sits on a border, so any brand color. */
export const EDGE_PALETTE = [
  "hot-pink",
  "electric-cyan",
  "highlighter",
  "ultraviolet",
  "acid",
] as const;

export const STROBE_VARS = ["--df-strobe-paper", "--df-strobe-dark", "--df-strobe-edge"] as const;
