"use client";

import dynamic from "next/dynamic";

/** PSSB loads after the page (012 FR-022, R12): nothing of his is in the first paint. */
export const PssbLoader = dynamic(() => import("@/components/Pssb").then((m) => m.Pssb), {
  ssr: false,
});
