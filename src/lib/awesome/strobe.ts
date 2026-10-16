/**
 * The strobe (006 R7, analysis I1). It cycles strobe-only variables that backgrounds and borders
 * read, never a theme token that text reads, so no text can end up the color of its own backing.
 * Each palette names theme colors (`--color-<name>`), and strobeCss() steps through them in this
 * order.
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

/** The step the clock is on, as an attribute on <html>: the inline <head> script starts it at 0. */
export const STROBE_ATTR = "data-strobe-step";

export const STROBE_STEPS = 5;

export const nextStep = (step: number) => (step + 1) % STROBE_STEPS;

const NOT_STEADY = ":not([data-steady],[data-steady] *)";
const at = (i: number) => `:root[data-awesome="on"][${STROBE_ATTR}="${i}"]`;
const color = (palette: readonly string[], i: number) =>
  `var(--color-${palette[i % palette.length]})`;

/**
 * The strobe's colors: one set of rules per step, straight onto the classes that strobe. Moving the
 * step restyles just those elements, 2.5 times a second. A CSS animation ticked every frame, and
 * inherited variables restyled the whole page at every step (T024). Only backgrounds and borders
 * change, never a text color, and never inside [data-steady].
 */
export function strobeCss(): string {
  const rules: string[] = [];
  for (let i = 0; i < STROBE_STEPS; i++) {
    rules.push(
      `${at(i)} :is(.bg-paper,.field-backing)${NOT_STEADY}{background-color:${color(PAPER_PALETTE, i)}}`,
      `${at(i)} .solid-backing${NOT_STEADY}{background-color:${color(DARK_PALETTE, i)}}`,
      `${at(i)} :is(.border-ink,.field-backing)${NOT_STEADY}{border-color:${color(EDGE_PALETTE, i)}}`,
    );
  }
  return rules.join("\n");
}

/** The plain page field strobing too: only while the pipes aren't covering it (switchOffCss). */
export function fieldStrobeCss(): string {
  return [...Array(STROBE_STEPS).keys()]
    .map((i) => `${at(i)} body{background-color:${color(PAPER_PALETTE, i)}}`)
    .join("\n");
}
