"use client";

import { useEffect, useRef } from "react";
import { COUNTDOWN_MS, formatCountdown, remainingMs } from "@/lib/urgency/countdown";

const ANCHOR_KEY = "df-countdown-anchor";
let memoryAnchor: number | null = null;

/** This browser's cycle start: saved the first time a countdown shows, shared by every tab (R4). */
function readAnchor(): number {
  try {
    const saved = Number(localStorage.getItem(ANCHOR_KEY));
    if (Number.isFinite(saved) && saved > 0) return saved;
    const now = Date.now();
    localStorage.setItem(ANCHOR_KEY, String(now));
    return now;
  } catch {
    return (memoryAnchor ??= Date.now());
  }
}

/**
 * The shared countdown (004 US2): a deadline line and the time left, to the millisecond. It writes
 * its text straight to the element every frame, so it never re-renders React (constitution VII),
 * and it holds a fixed width, so nothing beside it moves. Paused by the browser in background tabs.
 */
export function Countdown({ kind, label }: { kind: "deal" | "hold"; label: string }) {
  const time = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const anchor = readAnchor();
    let frame = 0;
    let written = 0;
    const tick = (at: number) => {
      // ~20 writes a second still reads as a blur of milliseconds, at a third of the work.
      if (at - written >= 50 && time.current) {
        time.current.textContent = formatCountdown(remainingMs(Date.now(), anchor));
        written = at;
      }
      frame = requestAnimationFrame(tick);
    };
    tick(performance.now());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <p
      data-steady
      className="border-ink bg-ink text-paper inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 border-4 px-3 py-2 shadow-[4px_4px_0_var(--color-hot-pink)]"
    >
      <span className="font-display text-sm uppercase">{label}</span>
      <span
        ref={time}
        data-testid="countdown"
        data-kind={kind}
        // A fixed box with layout/paint containment: the ticking text never re-lays out the page.
        className="text-highlighter inline-block w-[9ch] font-mono text-xl font-bold tabular-nums [contain:layout_paint]"
      >
        {formatCountdown(COUNTDOWN_MS)}
      </span>
    </p>
  );
}
