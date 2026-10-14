"use client"; // Last-resort boundary: replaces the root layout, so it brings its own document.

import { useEffect } from "react";
import { copy } from "@/lib/copy";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(
      `[Dan Flashes] Server error${error.digest ? ` (digest ${error.digest})` : ""}. ` +
        "The terminal running the server says what broke and how to fix it.",
      error,
    );
  }, [error]);

  return (
    <html lang="en">
      <body className="loud-stripes flex min-h-screen items-center justify-center p-4">
        <title>{copy.errors.serverTitle}</title>
        <div className="solid-backing max-w-xl p-6">
          <p className="text-highlighter text-6xl font-black">500</p>
          <h1 className="mt-2 text-2xl font-black">{copy.errors.serverTitle}</h1>
          <p className="mt-3">{copy.errors.serverBody}</p>
          <button
            type="button"
            onClick={() => retry()}
            className="bg-hot-pink text-paper mt-5 inline-flex min-h-11 items-center px-4 font-black uppercase"
          >
            {copy.errors.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
