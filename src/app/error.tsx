"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { copy } from "@/lib/copy";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="loud-stripes border-ink rounded-sm border-4 p-6 md:p-12">
      <div className="solid-backing max-w-xl p-6">
        <p className="font-display text-highlighter text-6xl">500</p>
        <h1 className="font-display mt-2 text-2xl md:text-3xl">{copy.errors.serverTitle}</h1>
        <p className="mt-3">{copy.errors.serverBody}</p>
        <button
          type="button"
          onClick={() => retry()}
          className="font-display bg-hot-pink text-paper mt-5 inline-flex min-h-11 items-center px-4 uppercase"
        >
          {copy.errors.retry}
        </button>
      </div>
    </section>
  );
}
