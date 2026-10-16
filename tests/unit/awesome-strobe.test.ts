import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DARK_PALETTE,
  EDGE_PALETTE,
  fieldStrobeCss,
  nextStep,
  PAPER_PALETTE,
  STROBE_ATTR,
  STROBE_HOLD_MS,
  STROBE_STEPS,
  strobeCss,
} from "@/lib/awesome/strobe";

const globals = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

type Rule = { step: number; selector: string; property: string; color: string };

/** Every rule in a strobe stylesheet: which step, what it targets, and the color it sets. */
function rules(css: string): Rule[] {
  return [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, selector, body]) => {
    const [property, value] = body.split(/:\s*/);
    return {
      step: Number(/\[data-strobe-step="(\d+)"\]/.exec(selector)?.[1]),
      selector: selector.trim(),
      property: property.trim(),
      color: /var\(--color-([a-z-]+)\)/.exec(value)?.[1] ?? value,
    };
  });
}
const sequence = (all: Rule[], target: string) =>
  all.filter((r) => r.selector.includes(target)).map((r) => r.color);
const cycle = (palette: readonly string[]) =>
  [...Array(STROBE_STEPS).keys()].map((i) => palette[i % palette.length]);

describe("the strobe (006 R7)", () => {
  it("holds every color for at least 400 ms: never more than 3 changes a second (FR-011)", () => {
    expect(STROBE_HOLD_MS).toBeGreaterThanOrEqual(400);
    expect(1000 / STROBE_HOLD_MS).toBeLessThanOrEqual(3);
  });

  it("keeps hot pink and ultraviolet off paper, and only darks behind light text (analysis I1)", () => {
    expect(PAPER_PALETTE).not.toContain("hot-pink");
    expect(PAPER_PALETTE).not.toContain("ultraviolet");
    expect([...DARK_PALETTE].sort()).toEqual(["ink", "ultraviolet"]);
    expect(EDGE_PALETTE.length).toBeGreaterThanOrEqual(3);
  });

  it("steps through STROBE_STEPS steps, in order, and wraps", () => {
    expect(STROBE_ATTR).toBe("data-strobe-step");
    expect(nextStep(0)).toBe(1);
    expect(nextStep(STROBE_STEPS - 1)).toBe(0);
    expect([...new Set(rules(strobeCss()).map((r) => r.step))]).toEqual([
      ...Array(STROBE_STEPS).keys(),
    ]);
  });

  it("steps backgrounds, backings and borders through their palettes, in order", () => {
    const all = rules(strobeCss());
    expect(sequence(all, ".bg-paper")).toEqual(cycle(PAPER_PALETTE));
    expect(sequence(all, ".solid-backing")).toEqual(cycle(DARK_PALETTE));
    expect(sequence(all, ".border-ink")).toEqual(cycle(EDGE_PALETTE));
    expect(sequence(rules(fieldStrobeCss()), "body")).toEqual(cycle(PAPER_PALETTE));
  });

  it("only changes backgrounds and borders, never a text color, and never the steady parts", () => {
    for (const rule of [...rules(strobeCss()), ...rules(fieldStrobeCss())]) {
      expect(["background-color", "border-color"]).toContain(rule.property);
      expect(rule.selector).toContain(':root[data-awesome="on"][data-strobe-step=');
      if (!rule.selector.endsWith("body")) {
        expect(rule.selector).toContain(":not([data-steady],[data-steady] *)");
      }
    }
  });

  it("never runs as a CSS animation, and never through inherited variables: both restyled the whole page (T024)", () => {
    expect(globals).not.toMatch(/@keyframes df-strobe/);
    expect(globals).not.toMatch(/animation:\s*df-strobe/);
    expect(strobeCss()).not.toMatch(/--df-strobe/);
  });

  it("the button's rainbow hops no faster than the strobe, never per frame (FR-011)", () => {
    const decl = /animation:\s*df-awesome-slide\s+(\d+)ms\s+steps\((\d+)\)\s+infinite/.exec(
      globals,
    );
    expect(decl, "animation: df-awesome-slide <ms> steps(<n>) infinite").not.toBeNull();
    expect(Number(decl![1]) / Number(decl![2])).toBeGreaterThanOrEqual(STROBE_HOLD_MS);
  });
});
