"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Filters fold into a toggle on phones; from the `md` breakpoint up they're always visible via
 * CSS alone — no hydration race, no layout shift on desktop.
 */
export function FilterDrawer({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="border-ink bg-paper border-4 shadow-[6px_6px_0_var(--color-ink)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="font-display bg-ink text-highlighter flex min-h-11 w-full items-center justify-between px-4 uppercase md:hidden"
      >
        {label}
        <span aria-hidden>{open ? "▲" : "▼"}</span>
      </button>
      <p className="font-display bg-ink text-highlighter hidden min-h-11 items-center px-4 uppercase md:flex">
        {label}
      </p>
      <div id={panelId} className={`${open ? "block" : "hidden"} p-4 md:block`}>
        {children}
      </div>
    </div>
  );
}
