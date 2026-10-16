/**
 * The Pipes Background (006 US2, research R6): the old office screensaver, as a pure, seeded growth
 * engine. A few pipes grow one grid cell per step. Each runs straight, or turns 90° into a free
 * cell, leaving a joint (now and then, a teapot). A pipe that's boxed in ends, and another starts.
 * When the screen is 70% pipe, it clears and starts over. No DOM here: each step returns what to
 * draw, and PipesBackground draws it.
 */

export const CELL_PX_PHONE = 28;
export const CELL_PX = 40;
/** Below this width (px), the smaller cell. */
export const PHONE_BELOW = 768;
export const MAX_PIPES = 4;
export const CLEAR_AT = 0.7;
export const TEAPOT_ODDS = 1 / 60;
/** How often a pipe tries to turn rather than run straight. */
const TURN_ODDS = 0.2;

/** The screensaver's own colors, not the store's. */
export const CLASSIC_COLORS = [
  { name: "red", hex: "#e3201b" },
  { name: "green", hex: "#1fa833" },
  { name: "blue", hex: "#2156d8" },
  { name: "yellow", hex: "#e8cf1c" },
  { name: "cyan", hex: "#1fc6d6" },
  { name: "magenta", hex: "#c723c4" },
  { name: "white", hex: "#e6e6e6" },
] as const;

export type Cell = { x: number; y: number };

export type Command =
  | { kind: "start"; pipe: number; at: Cell; color: string }
  | { kind: "segment"; pipe: number; from: Cell; to: Cell; color: string }
  | { kind: "joint"; pipe: number; at: Cell; color: string; teapot: boolean }
  | { kind: "end"; pipe: number; at: Cell; color: string }
  | { kind: "clear" };

/** The grid for a screen: smaller cells on a phone, and at least one cell each way. */
export function gridFor(width: number, height: number) {
  const cell = width < PHONE_BELOW ? CELL_PX_PHONE : CELL_PX;
  return {
    cols: Math.max(1, Math.ceil(width / cell)),
    rows: Math.max(1, Math.ceil(height / cell)),
    cell,
  };
}

/** mulberry32: small, fast, and the same sequence for the same seed. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIRS: readonly Cell[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

type Pipe = { id: number; head: Cell; dir: number; color: string; moved: boolean };

export function createEngine({ cols, rows, seed }: { cols: number; rows: number; seed: number }) {
  const random = seeded(seed);
  const total = cols * rows;
  let used = new Uint8Array(total);
  let occupied = 0;
  let live: Pipe[] = [];
  let nextId = 1;

  const index = (c: Cell) => c.y * cols + c.x;
  const isFree = (c: Cell) => c.x >= 0 && c.x < cols && c.y >= 0 && c.y < rows && !used[index(c)];
  const take = (c: Cell) => {
    used[index(c)] = 1;
    occupied++;
  };
  const toward = (c: Cell, dir: number): Cell => ({ x: c.x + DIRS[dir].x, y: c.y + DIRS[dir].y });

  function freeCell(): Cell | null {
    for (let i = 0; i < 24; i++) {
      const c = { x: Math.floor(random() * cols), y: Math.floor(random() * rows) };
      if (isFree(c)) return c;
    }
    const from = Math.floor(random() * total);
    for (let k = 0; k < total; k++) {
      const i = (from + k) % total;
      if (!used[i]) return { x: i % cols, y: Math.floor(i / cols) };
    }
    return null;
  }

  function clear(): Command[] {
    used = new Uint8Array(total);
    occupied = 0;
    live = [];
    return [{ kind: "clear" }];
  }

  function step(): Command[] {
    const out: Command[] = [];
    if (live.length < MAX_PIPES) {
      const at = freeCell();
      if (at) {
        take(at);
        const color = CLASSIC_COLORS[Math.floor(random() * CLASSIC_COLORS.length)].hex;
        const pipe = { id: nextId++, head: at, dir: Math.floor(random() * 4), color, moved: false };
        live.push(pipe);
        out.push({ kind: "start", pipe: pipe.id, at, color });
      } else if (live.length === 0) {
        return clear();
      }
    }

    for (const pipe of [...live]) {
      const left = (pipe.dir + 3) % 4;
      const right = (pipe.dir + 1) % 4;
      const turns = random() < 0.5 ? [left, right] : [right, left];
      const order = random() < TURN_ODDS ? [...turns, pipe.dir] : [pipe.dir, ...turns];
      const dir = order.find((d) => isFree(toward(pipe.head, d)));
      if (dir === undefined) {
        out.push({ kind: "end", pipe: pipe.id, at: pipe.head, color: pipe.color });
        live = live.filter((p) => p !== pipe);
        continue;
      }
      if (pipe.moved && dir !== pipe.dir) {
        out.push({
          kind: "joint",
          pipe: pipe.id,
          at: pipe.head,
          color: pipe.color,
          teapot: random() < TEAPOT_ODDS,
        });
      }
      const to = toward(pipe.head, dir);
      take(to);
      out.push({ kind: "segment", pipe: pipe.id, from: pipe.head, to, color: pipe.color });
      pipe.head = to;
      pipe.dir = dir;
      pipe.moved = true;
    }

    if (occupied >= CLEAR_AT * total) out.push(...clear());
    return out;
  }

  return { step, occupied: () => occupied, live: () => live.length };
}
