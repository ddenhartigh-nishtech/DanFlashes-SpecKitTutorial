import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DARK_PALETTE,
  EDGE_PALETTE,
  PAPER_PALETTE,
  STROBE_HOLD_MS,
  STROBE_VARS,
} from "@/lib/awesome/strobe";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** The df-strobe keyframes: each stop's offset and the properties it sets. */
function keyframes() {
  const block = /@keyframes df-strobe\s*\{([\s\S]*?)\n\}/.exec(css)?.[1];
  if (!block) throw new Error("no @keyframes df-strobe in globals.css");
  return [...block.matchAll(/([\d.]+)%\s*\{([^}]*)\}/g)].map(([, offset, body]) => ({
    offset: Number(offset),
    props: Object.fromEntries(
      body
        .split(";")
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => d.split(/:\s*/) as [string, string]),
    ),
  }));
}

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

  it("is one stepped animation whose stops each last at least STROBE_HOLD_MS", () => {
    const decl = /animation:\s*df-strobe\s+(\d+)ms\s+step-end\s+infinite/.exec(css);
    expect(decl, "animation: df-strobe <ms> step-end infinite").not.toBeNull();
    const stops = keyframes().filter((k) => k.offset < 100);
    const durationMs = Number(decl![1]);
    for (let i = 0; i < stops.length; i++) {
      const next = i + 1 < stops.length ? stops[i + 1].offset : 100;
      expect(((next - stops[i].offset) / 100) * durationMs).toBeGreaterThanOrEqual(STROBE_HOLD_MS);
    }
  });

  it("the button's rainbow hops no faster than the strobe, never per frame (FR-011)", () => {
    const decl = /animation:\s*df-awesome-slide\s+(\d+)ms\s+steps\((\d+)\)\s+infinite/.exec(css);
    expect(decl, "animation: df-awesome-slide <ms> steps(<n>) infinite").not.toBeNull();
    expect(Number(decl![1]) / Number(decl![2])).toBeGreaterThanOrEqual(STROBE_HOLD_MS);
  });

  it("only ever sets the strobe's own variables, never a theme color token", () => {
    for (const { props } of keyframes()) {
      for (const name of Object.keys(props)) {
        expect(STROBE_VARS).toContain(name);
        expect(name).not.toMatch(/^--color-/);
      }
    }
  });

  it("steps each variable through its palette, in order", () => {
    const stops = keyframes().filter((k) => k.offset < 100);
    const sequence = (variable: string) =>
      stops.map((s) => /var\(--color-([a-z-]+)\)/.exec(s.props[variable] ?? "")?.[1]);
    const cycle = (palette: readonly string[]) => stops.map((_, i) => palette[i % palette.length]);
    expect(sequence("--df-strobe-paper")).toEqual(cycle(PAPER_PALETTE));
    expect(sequence("--df-strobe-dark")).toEqual(cycle(DARK_PALETTE));
    expect(sequence("--df-strobe-edge")).toEqual(cycle(EDGE_PALETTE));
  });
});
