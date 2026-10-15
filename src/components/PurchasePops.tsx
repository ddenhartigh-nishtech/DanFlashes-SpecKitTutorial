"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/lib/copy";
import { pickPop, popDue, POP_SHOW_MS, scheduleNext, type PopShirt } from "@/lib/urgency/pops";
import type { Coworker } from "@/lib/urgency/social-proof";

const u = copy.urgency;
const NEXT_KEY = "df-pop-next";
const LEAVE_MS = 300;
let memoryNext: number | null = null;

/** When the next pop-up is due, kept per tab so the rhythm survives a full reload (R6). */
function readNext(): number {
  try {
    const raw = sessionStorage.getItem(NEXT_KEY);
    if (raw !== null && Number.isFinite(Number(raw))) return Number(raw);
  } catch {
    if (memoryNext !== null) return memoryNext;
  }
  const next = scheduleNext(Date.now(), Math.random());
  writeNext(next);
  return next;
}

function writeNext(at: number) {
  memoryNext = at;
  try {
    sessionStorage.setItem(NEXT_KEY, String(at));
  } catch {
    // storage blocked: the in-memory schedule carries this page
  }
}

interface Pop {
  shirt: PopShirt;
  coworker: Coworker;
  leaving: boolean;
}

/**
 * Fake purchases (004 US3, FR-015): one at a time, every 20–40 s, on every page. Bottom-right on a
 * wider screen; on a phone, a full-width banner riding just under the sticky header. Each slides
 * away on its own, and its (x) closes it at once without stopping the next.
 */
export function PurchasePops({ candidates }: { candidates: PopShirt[] }) {
  const [pop, setPop] = useState<Pop | null>(null);
  const showing = useRef(false);

  useEffect(() => {
    const check = () => {
      if (showing.current) return;
      const visible = document.visibilityState === "visible";
      if (!popDue({ now: Date.now(), nextAt: readNext(), visible })) return;
      const chosen = pickPop(candidates, u.cast, Math.random(), Math.random());
      if (!chosen) return;
      showing.current = true;
      writeNext(scheduleNext(Date.now() + POP_SHOW_MS, Math.random()));
      setPop({ ...chosen, leaving: false });
    };
    const first = setTimeout(check, 50);
    const every = setInterval(check, 1000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(first);
      clearInterval(every);
      document.removeEventListener("visibilitychange", check);
    };
  }, [candidates]);

  const shown = pop !== null;
  useEffect(() => {
    if (!shown) return;
    const leave = setTimeout(
      () => setPop((p) => p && { ...p, leaving: true }),
      POP_SHOW_MS - LEAVE_MS,
    );
    const gone = setTimeout(() => {
      showing.current = false;
      setPop(null);
    }, POP_SHOW_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(gone);
    };
  }, [shown]);

  if (!pop) return null;
  const dismiss = () => {
    showing.current = false;
    writeNext(scheduleNext(Date.now(), Math.random()));
    setPop(null);
  };
  return (
    <div
      data-testid="purchase-pop"
      role="status"
      className={`border-ink bg-highlighter text-ink absolute inset-x-0 top-full z-50 mt-1 flex items-start gap-3 border-b-4 px-4 py-3 font-bold shadow-[0_4px_0_var(--color-hot-pink)] transition duration-300 md:fixed md:inset-x-auto md:top-auto md:right-3 md:bottom-3 md:mt-0 md:w-80 md:border-4 md:shadow-[4px_4px_0_var(--color-hot-pink)] ${
        pop.leaving ? "translate-y-2 opacity-0" : "animate-[df-pop-in_200ms_ease-out]"
      }`}
    >
      <p className="flex-1 [overflow-wrap:anywhere]">
        {u.bought(pop.coworker.name, pop.coworker.department)}{" "}
        <Link
          href={`/shirts/${pop.shirt.slug}`}
          className="underline decoration-4 underline-offset-2"
        >
          {pop.shirt.name}
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={u.dismissPop}
        title={u.dismissPop}
        className="bg-hot-pink text-paper border-ink font-display flex size-8 shrink-0 items-center justify-center rounded-full border-4 text-xs leading-none"
      >
        ✕
      </button>
    </div>
  );
}
