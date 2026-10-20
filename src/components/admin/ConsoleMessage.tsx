"use client";

import { useEffect, useState } from "react";
import type { ConsoleState } from "@/lib/admin/state";

/** How long a confirmation stays: long enough to read, gone before the next save (owner). */
export const CONFIRMATION_MS = 4_000;

/**
 * A console action's answer: calm when it saved, gentle and specific when it didn't. A
 * confirmation quietly goes after a few seconds, so the next save shows it again; every action
 * returns a new answer, even with the same words. A refusal stays: it says what to fix. Nothing
 * fades or slides (constitution V, the back office is calm).
 */
export function ConsoleMessage({ state }: { state: ConsoleState | null }) {
  const [expired, setExpired] = useState<ConsoleState | null>(null);
  useEffect(() => {
    if (!state?.ok) return;
    const timer = setTimeout(() => setExpired(state), CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [state]);
  if (!state || state === expired) return null;
  return (
    <div
      role="status"
      data-testid="console-message"
      data-ok={state.ok}
      className={`rounded-md border px-3 py-2 text-sm ${state.ok ? "border-office-sage/40 bg-[#eef3f0]" : "border-beige bg-[#f7f1e6]"}`}
    >
      <p>{state.message}</p>
      {!state.ok && state.link ? (
        <a href={state.link.href} className="underline underline-offset-4">
          {state.link.label}
        </a>
      ) : null}
      {!state.ok && state.issues?.length ? (
        <ul className="mt-1 list-disc pl-5">
          {state.issues.map((issue, i) => (
            <li key={i}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
