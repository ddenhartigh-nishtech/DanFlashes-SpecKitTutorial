"use client";

import { useEffect, useRef } from "react";
import { AWESOME_ATTR } from "@/lib/awesome/choice";
import { createEngine, gridFor, type Cell, type Command } from "@/lib/pipes/engine";
import { STEPS_PER_SECOND, stepsDue } from "@/lib/pipes/loop";

const MAX_STEPS_PER_FRAME = 3;
const RESIZE_DEBOUNCE_MS = 150;

/** A classic color, lit from the top left: lighter toward the highlight, darker at the edge. */
function mix(hex: string, toward: number, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(v + (toward - v) * amount),
  );
  return `rgb(${rgb.join(",")})`;
}
const light = (hex: string) => mix(hex, 255, 0.55);
const dark = (hex: string) => mix(hex, 0, 0.6);

/**
 * The Pipes Background (006 US2, research R6): the old office screensaver, behind every page while
 * Extreme Awesomeness is on. A fixed canvas under everything that never takes a tap. It draws only
 * each step's new pieces, pauses while the page can't be seen, and starts over when the window
 * changes size. The island mounts it only while the owner's Pipes switch is on.
 */
export function PipesBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const root = document.documentElement;

    let engine = createEngine({ cols: 1, rows: 1, seed: 1 });
    let cell = 40;
    let generation = 0;
    let shown = false;
    let running = false;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = 0;
    let carry = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const center = (c: Cell) => ({ x: c.x * cell + cell / 2, y: c.y * cell + cell / 2 });

    const segment = (from: Cell, to: Cell, color: string) => {
      const a = center(from);
      const b = center(to);
      const tube = cell * 0.38;
      const across = a.y === b.y;
      const g = across
        ? ctx.createLinearGradient(0, a.y - tube / 2, 0, a.y + tube / 2)
        : ctx.createLinearGradient(a.x - tube / 2, 0, a.x + tube / 2, 0);
      g.addColorStop(0, dark(color));
      g.addColorStop(0.3, color);
      g.addColorStop(0.45, light(color));
      g.addColorStop(0.65, color);
      g.addColorStop(1, dark(color));
      ctx.fillStyle = g;
      if (across) ctx.fillRect(Math.min(a.x, b.x), a.y - tube / 2, Math.abs(b.x - a.x), tube);
      else ctx.fillRect(a.x - tube / 2, Math.min(a.y, b.y), tube, Math.abs(b.y - a.y));
    };

    const shine = (x: number, y: number, r: number, color: string) => {
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, light(color));
      g.addColorStop(0.5, color);
      g.addColorStop(1, dark(color));
      return g;
    };

    const ball = (at: Cell, color: string, scale = 0.3) => {
      const { x, y } = center(at);
      const r = cell * scale;
      ctx.fillStyle = shine(x, y, r, color);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    // As in the original, now and then a joint is a teapot.
    const teapot = (at: Cell, color: string) => {
      const { x, y } = center(at);
      const s = cell * 0.4;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = shine(0, 0, s, color);
      ctx.strokeStyle = color;
      ctx.lineWidth = s * 0.18;
      ctx.beginPath();
      ctx.ellipse(0, s * 0.12, s * 0.78, s * 0.56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.42, s * 0.42, s * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -s * 0.62, s * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.62, s * 0.1);
      ctx.quadraticCurveTo(s * 1.0, 0, s * 1.12, -s * 0.38);
      ctx.lineTo(s * 0.96, -s * 0.38);
      ctx.quadraticCurveTo(s * 0.86, -s * 0.06, s * 0.56, s * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-s * 0.78, s * 0.08, s * 0.32, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
    };

    const draw = (commands: Command[]) => {
      // Tubes first, so every ball and teapot sits over the corner it joins.
      for (const c of commands) {
        if (c.kind === "clear") ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (c.kind === "segment") segment(c.from, c.to, c.color);
      }
      for (const c of commands) {
        if (c.kind === "start" || c.kind === "end") ball(c.at, c.color, 0.24);
        if (c.kind === "joint") {
          if (c.teapot) teapot(c.at, c.color);
          else ball(c.at, c.color);
        }
      }
    };

    // A fresh screen at the window's size: new grid, new pipes.
    const begin = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const grid = gridFor(width, height);
      cell = grid.cell;
      engine = createEngine({
        cols: grid.cols,
        rows: grid.rows,
        seed: (Math.random() * 2 ** 32) >>> 0,
      });
      ctx.clearRect(0, 0, width, height);
      generation++;
      canvas.dataset.generation = String(generation);
      carry = 0;
      last = performance.now();
    };

    // Wake about as often as there's a step to draw, not 60 times a second: a timer, then one frame.
    const schedule = () => {
      timer = setTimeout(() => {
        frame = requestAnimationFrame(tick);
      }, 1000 / STEPS_PER_SECOND);
    };
    const tick = (now: number) => {
      if (!running) return;
      const { steps, leftoverMs } = stepsDue(
        now - last + carry,
        STEPS_PER_SECOND,
        MAX_STEPS_PER_FRAME,
      );
      last = now;
      carry = leftoverMs;
      for (let i = 0; i < steps; i++) draw(engine.step());
      schedule();
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      carry = 0;
      schedule();
    };
    const stop = () => {
      running = false;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };

    // On with Extreme Awesomeness, paused while the page can't be seen (FR-017).
    const sync = () => {
      const on = root.getAttribute(AWESOME_ATTR) === "on";
      if (on && !shown) {
        shown = true;
        begin();
      }
      if (!on) shown = false;
      if (shown && document.visibilityState !== "hidden") start();
      else stop();
    };
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => shown && begin(), RESIZE_DEBOUNCE_MS);
    };

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: [AWESOME_ATTR] });
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("resize", onResize);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
      stop();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      data-testid="pipes"
      aria-hidden
      className="df-pipes pointer-events-none fixed inset-0 z-[-1] h-full w-full"
    />
  );
}
