"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { ShirtImage } from "@/components/ShirtImage";
import { copy } from "@/lib/copy";

const MIN = 1;
const MAX = 8;
const STEP = 1.5;
/** A press that travels further than this is a drag (pan), not a click (enhance). */
const CLICK_SLOP = 6;

interface ZoomViewerProps {
  src: string | null;
  alt: string;
  placeholderSrc: string | null;
  /** Rendered over the image (the tier badge). */
  overlay?: React.ReactNode;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** Zoom/enhance up to 8×: click or ENHANCE, mouse wheel, touch pinch, and drag to pan. */
export function ZoomViewer({ src, alt, placeholderSrc, overlay }: ZoomViewerProps) {
  const [scale, setScale] = useState(MIN);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const press = useRef<{ x: number; y: number; dragged: boolean } | null>(null);

  const clampOffset = useCallback((o: { x: number; y: number }, s: number) => {
    const el = frame.current;
    const maxX = el ? (el.clientWidth * (s - 1)) / 2 : 0;
    const maxY = el ? (el.clientHeight * (s - 1)) / 2 : 0;
    return { x: clamp(o.x, -maxX, maxX), y: clamp(o.y, -maxY, maxY) };
  }, []);

  const zoomTo = useCallback(
    (next: number) => {
      const s = clamp(next, MIN, MAX);
      setScale(s);
      setOffset((o) => clampOffset(o, s));
    },
    [clampOffset],
  );

  // Wheel needs a non-passive listener so the page doesn't scroll while zooming.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => {
        const next = clamp(e.deltaY < 0 ? s * 1.2 : s / 1.2, MIN, MAX);
        setOffset((o) => clampOffset(o, next));
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clampOffset]);

  const enhance = () => zoomTo(scale * STEP);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) press.current = { x: e.clientX, y: e.clientY, dragged: false };
    if (pointers.current.size === 2) {
      if (press.current) press.current.dragged = true; // a pinch is never a click
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: distance(a, b), scale };
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (press.current && distance(press.current, { x: e.clientX, y: e.clientY }) > CLICK_SLOP) {
      press.current.dragged = true;
    }
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      zoomTo((pinch.current.scale * distance(a, b)) / pinch.current.distance);
    } else if (pointers.current.size === 1 && scale > MIN) {
      setOffset((o) =>
        clampOffset({ x: o.x + e.clientX - previous.x, y: o.y + e.clientY - previous.y }, scale),
      );
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const button =
    "font-display min-h-11 min-w-11 border-4 border-ink px-3 uppercase shadow-[3px_3px_0_var(--color-ink)] disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={frame}
        data-testid="zoom-frame"
        data-scale={scale.toFixed(2)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // The magnifier means it: a click enhances, exactly like the ENHANCE button.
        onClick={() => {
          if (!press.current?.dragged) enhance();
          press.current = null;
        }}
        className={`border-ink bg-ink relative aspect-square touch-none overflow-hidden border-4 select-none ${
          scale >= MAX
            ? "cursor-grab active:cursor-grabbing"
            : scale > MIN
              ? "cursor-zoom-in active:cursor-grabbing"
              : "cursor-zoom-in"
        }`}
      >
        <div
          className="pointer-events-none h-full w-full origin-center transition-transform duration-75"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          <ShirtImage
            src={src}
            alt={alt}
            placeholderSrc={placeholderSrc}
            priority
            className="h-full w-full object-contain"
          />
        </div>
        {overlay ? <div className="absolute top-3 left-3">{overlay}</div> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={enhance}
          disabled={scale >= MAX}
          className={`${button} bg-highlighter`}
        >
          {copy.product.enhance}
        </button>
        <button
          type="button"
          onClick={() => zoomTo(scale / STEP)}
          disabled={scale <= MIN}
          aria-label={copy.product.zoomOut}
          className={`${button} bg-paper`}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            setScale(MIN);
            setOffset({ x: 0, y: 0 });
          }}
          disabled={scale === MIN}
          className={`${button} bg-paper`}
        >
          {copy.product.reset}
        </button>
        <span aria-live="polite" className="font-display bg-ink text-paper px-2 py-1 text-sm">
          {scale.toFixed(1)}×
        </span>
      </div>
      <p className="field-backing w-fit text-sm font-semibold">{copy.product.zoomHint}</p>
    </div>
  );
}
