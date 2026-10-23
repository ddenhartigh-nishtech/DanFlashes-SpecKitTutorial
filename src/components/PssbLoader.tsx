"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/** PSSB loads after the page (012 FR-022, R12): nothing of his is in the first paint. */
const Pssb = dynamic(() => import("@/components/Pssb").then((m) => m.Pssb), { ssr: false });

/** The longest the chat waits for an idle moment before it loads anyway. */
const IDLE_TIMEOUT_MS = 3_000;

/** And his code isn't even fetched until the page is idle (T038), so it never competes with LCP. */
export function PssbLoader() {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: IDLE_TIMEOUT_MS });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setIdle(true), 1_000);
    return () => clearTimeout(id);
  }, []);
  return idle ? <Pssb /> : null;
}
