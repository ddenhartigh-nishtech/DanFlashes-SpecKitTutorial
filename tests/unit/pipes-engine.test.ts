import { describe, expect, it } from "vitest";
import {
  CELL_PX,
  CELL_PX_PHONE,
  CLASSIC_COLORS,
  CLEAR_AT,
  createEngine,
  gridFor,
  MAX_PIPES,
  TEAPOT_ODDS,
  type Cell,
  type Command,
} from "@/lib/pipes/engine";
import { STEPS_PER_SECOND, stepsDue } from "@/lib/pipes/loop";

const key = (c: Cell) => `${c.x},${c.y}`;
const dir = (a: Cell, b: Cell) => `${b.x - a.x},${b.y - a.y}`;

/** Run an engine for `steps` steps and collect every command, split into fills between clears. */
function run(steps: number, seed = 7, cols = 24, rows = 16) {
  const engine = createEngine({ cols, rows, seed });
  const fills: Command[][] = [[]];
  for (let i = 0; i < steps; i++) {
    for (const command of engine.step()) {
      if (command.kind === "clear") fills.push([]);
      else fills.at(-1)!.push(command);
    }
  }
  return { engine, fills, all: fills.flat() };
}

describe("gridFor (006 R6)", () => {
  it("uses 28 px cells below 768 px wide, and 40 px otherwise", () => {
    expect(CELL_PX_PHONE).toBe(28);
    expect(CELL_PX).toBe(40);
    expect(gridFor(360, 780)).toEqual({
      cols: Math.ceil(360 / 28),
      rows: Math.ceil(780 / 28),
      cell: 28,
    });
    expect(gridFor(1280, 900)).toEqual({ cols: 32, rows: Math.ceil(900 / 40), cell: 40 });
    expect(gridFor(767, 500).cell).toBe(28);
    expect(gridFor(768, 500).cell).toBe(40);
  });

  it("always has at least one cell each way", () => {
    expect(gridFor(0, 0)).toMatchObject({ cols: 1, rows: 1 });
  });
});

describe("createEngine (006 R6)", () => {
  it("moves each pipe one cell at a time, straight or turned 90°, never reversing, never into a used or off-grid cell", () => {
    const cols = 24;
    const rows = 16;
    const { fills } = run(4000, 7, cols, rows);
    expect(fills.length).toBeGreaterThan(2); // it filled and cleared more than once
    for (const fill of fills) {
      const used = new Set<string>();
      const last = new Map<number, Cell[]>();
      for (const c of fill) {
        if (c.kind === "start") {
          expect(used.has(key(c.at))).toBe(false);
          used.add(key(c.at));
          last.set(c.pipe, [c.at]);
        }
        if (c.kind !== "segment") continue;
        expect(Math.abs(c.to.x - c.from.x) + Math.abs(c.to.y - c.from.y)).toBe(1);
        expect(c.to.x >= 0 && c.to.x < cols && c.to.y >= 0 && c.to.y < rows).toBe(true);
        expect(used.has(key(c.to)), `entered ${key(c.to)} twice`).toBe(false);
        used.add(key(c.to));
        const path = last.get(c.pipe)!;
        expect(key(path.at(-1)!)).toBe(key(c.from));
        if (path.length >= 2) {
          const [a, b] = [path.at(-2)!, path.at(-1)!];
          expect(dir(b, c.to), "reversed").not.toBe(dir(b, a));
        }
        path.push(c.to);
      }
    }
  });

  it("puts a joint at every change of direction", () => {
    const { fills } = run(3000);
    for (const fill of fills) {
      const joints = new Set(
        fill.filter((c) => c.kind === "joint").map((c) => `${c.pipe}@${key(c.at)}`),
      );
      const paths = new Map<number, Cell[]>();
      for (const c of fill) {
        if (c.kind === "start") paths.set(c.pipe, [c.at]);
        if (c.kind === "segment") paths.get(c.pipe)!.push(c.to);
      }
      for (const [pipe, path] of paths) {
        for (let i = 1; i < path.length - 1; i++) {
          if (dir(path[i - 1], path[i]) !== dir(path[i], path[i + 1])) {
            expect(joints.has(`${pipe}@${key(path[i])}`), `no joint at a turn`).toBe(true);
          }
        }
      }
    }
  });

  it("grows at most 4 pipes at once, ends a pipe with nowhere to go, and starts another", () => {
    expect(MAX_PIPES).toBe(4);
    const engine = createEngine({ cols: 24, rows: 16, seed: 3 });
    let ends = 0;
    let starts = 0;
    for (let i = 0; i < 2000; i++) {
      const commands = engine.step();
      ends += commands.filter((c) => c.kind === "end").length;
      starts += commands.filter((c) => c.kind === "start").length;
      expect(engine.live()).toBeLessThanOrEqual(MAX_PIPES);
    }
    expect(ends).toBeGreaterThan(0);
    expect(starts).toBeGreaterThan(ends);
  });

  it("only uses the classic screensaver colors", () => {
    expect(CLASSIC_COLORS.map((c) => c.name)).toEqual([
      "red",
      "green",
      "blue",
      "yellow",
      "cyan",
      "magenta",
      "white",
    ]);
    const hexes = new Set<string>(CLASSIC_COLORS.map((c) => c.hex));
    for (const c of run(1500).all) {
      if ("color" in c) expect(hexes.has(c.color)).toBe(true);
    }
  });

  it("clears once 70% of the cells are taken, then grows again on an empty grid", () => {
    expect(CLEAR_AT).toBe(0.7);
    const cols = 20;
    const rows = 12;
    const engine = createEngine({ cols, rows, seed: 11 });
    let cleared = false;
    for (let i = 0; i < 5000 && !cleared; i++) {
      const before = engine.occupied();
      const commands = engine.step();
      if (commands.some((c) => c.kind === "clear")) {
        cleared = true;
        expect(before + 4).toBeGreaterThanOrEqual(Math.floor(CLEAR_AT * cols * rows) - 4);
        expect(engine.occupied()).toBeLessThanOrEqual(MAX_PIPES);
      }
    }
    expect(cleared).toBe(true);
    expect(engine.step().length).toBeGreaterThan(0);
  });

  it("makes about 1 joint in 60 a teapot", () => {
    expect(TEAPOT_ODDS).toBeCloseTo(1 / 60, 10);
    const engine = createEngine({ cols: 40, rows: 30, seed: 2026 });
    let joints = 0;
    let teapots = 0;
    while (joints < 6000) {
      for (const c of engine.step()) {
        if (c.kind !== "joint") continue;
        joints++;
        if (c.teapot) teapots++;
      }
    }
    expect(Math.abs(teapots / joints - TEAPOT_ODDS)).toBeLessThanOrEqual(0.015);
  });

  it("is deterministic for a seed", () => {
    expect(run(500, 42).all).toEqual(run(500, 42).all);
    expect(run(500, 42).all).not.toEqual(run(500, 43).all);
  });
});

describe("stepsDue (006 R6, FR-018)", () => {
  it("grows 6 steps a second by default, by elapsed time", () => {
    expect(STEPS_PER_SECOND).toBe(6);
    expect(stepsDue(0, 25, 3)).toEqual({ steps: 0, leftoverMs: 0 });
    expect(stepsDue(39, 25, 3)).toEqual({ steps: 0, leftoverMs: 39 });
    expect(stepsDue(40, 25, 3)).toEqual({ steps: 1, leftoverMs: 0 });
    expect(stepsDue(100, 25, 3)).toEqual({ steps: 2, leftoverMs: 20 });
  });

  it("never bursts after a slow frame: it caps the steps and drops the backlog", () => {
    expect(stepsDue(1000, 25, 3)).toEqual({ steps: 3, leftoverMs: 0 });
    expect(stepsDue(120, 25, 3)).toEqual({ steps: 3, leftoverMs: 0 });
  });
});
