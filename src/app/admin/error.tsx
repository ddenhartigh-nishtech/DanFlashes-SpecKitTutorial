"use client";

import { useEffect } from "react";
import { ui } from "@/components/admin/ui";

/** Something broke in the back office. Calmly: the terminal running the server has the details. */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(`[Dan's Office] ${error.digest ? `digest ${error.digest}` : "error"}`, error);
  }, [error]);
  return (
    <div className={ui.card}>
      <h1 className={ui.h2}>Something didn&apos;t go as planned. That happens.</h1>
      <p className={`${ui.muted} mt-2`}>Nothing was lost. Try again when you&apos;re ready.</p>
      <button type="button" onClick={retry} className={`${ui.button} mt-4`}>
        Try again
      </button>
    </div>
  );
}
