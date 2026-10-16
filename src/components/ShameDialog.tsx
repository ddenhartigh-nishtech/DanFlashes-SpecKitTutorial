"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PriceTag } from "@/components/PriceTag";
import { ShirtBadge } from "@/components/ShirtBadge";
import { ShirtImage } from "@/components/ShirtImage";
import { copy } from "@/lib/copy";
import type { ShopperShirt } from "@/lib/data/shirts";
import { lineOrder, recommendationFor } from "@/lib/shaming/loop";

interface ShameDialogProps {
  ladder: ShopperShirt[];
  insistLabel: string;
  placeholderUrl: string | null;
  /** Called once the dialog has closed: relenting, Escape, or leaving for the recommendation. */
  onClose: () => void;
}

interface Loop {
  round: number;
  order: number[];
  at: number;
}

const POOL = copy.shame.lines.length;

/**
 * "You sure about that?" (002 US1). Mounted fresh each time he tries to add a bland shirt, and
 * endless: insisting only ever starts another round. Nothing in here talks to the server.
 */
export function ShameDialog({ ladder, insistLabel, placeholderUrl, onClose }: ShameDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [loop, setLoop] = useState<Loop>(() => ({
    round: 1,
    order: lineOrder(POOL, Math.random, null),
    at: 0,
  }));

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    // A modal dialog makes the rest of the document inert. Next keeps a page you navigate away
    // from mounted but hidden, so close on the way out or the next page can't be clicked.
    return () => dialog?.close();
  }, []);

  const leave = () => ref.current?.close();

  function insist() {
    setLoop(({ round, order, at }) =>
      at + 1 < order.length
        ? { round: round + 1, order, at: at + 1 }
        : { round: round + 1, order: lineOrder(POOL, Math.random, order[at]), at: 0 },
    );
  }

  const line = copy.shame.lines[loop.order[loop.at]];
  const pick = recommendationFor(loop.round, ladder);
  const image = pick?.images[0];

  return (
    <dialog
      data-steady
      ref={ref}
      data-testid="shame-dialog"
      data-round={loop.round}
      aria-labelledby="shame-title"
      // `close` fires a tick after close(). React Strict Mode (dev) runs the effect twice, so the
      // cleanup's close() arrives after the dialog has reopened: only a dialog that is still
      // closed has really been closed.
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      className="border-ink bg-paper backdrop:bg-ink/80 m-auto max-h-[90dvh] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto border-4 p-0 shadow-[8px_8px_0_var(--color-hot-pink)]"
    >
      <div className="loud-stripes border-ink border-b-4 p-3">
        <h2
          id="shame-title"
          className="font-display solid-backing text-highlighter px-3 py-2 text-3xl leading-tight md:text-4xl"
        >
          {copy.shame.title}
        </h2>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <p data-testid="shame-line" className="min-h-[3lh] text-lg font-bold">
          {line}
        </p>

        {pick ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase">{copy.shame.pitch}</p>
            <Link
              href={`/shirts/${pick.slug}`}
              onClick={leave}
              data-testid="shame-recommendation"
              className="border-ink bg-paper flex items-center gap-2 border-4 p-2 shadow-[4px_4px_0_var(--color-ink)] sm:gap-3"
            >
              <span className="border-ink bg-ink relative block aspect-square w-20 shrink-0 overflow-hidden border-2 sm:w-24">
                <ShirtImage
                  src={image?.url ?? null}
                  alt={image?.alt ?? pick.name}
                  placeholderSrc={placeholderUrl}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-display text-lg leading-tight">{pick.name}</span>
                <ShirtBadge tier={pick.tier} />
                <PriceTag priceUsd={pick.finalPriceUsd} />
              </span>
            </Link>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Link
            href={pick ? `/shirts/${pick.slug}` : "/shirts"}
            onClick={leave}
            className="font-display bg-hot-pink text-paper flex min-h-12 items-center justify-center px-4 text-center text-lg uppercase shadow-[4px_4px_0_var(--color-ink)]"
          >
            {pick ? copy.shame.takeIt : copy.shame.nothingBetter}
          </Link>
          {/* Relenting means going to look at real shirts. Escape is the only way to stay put. */}
          <Link
            href="/shirts"
            onClick={leave}
            className="font-display border-ink bg-highlighter flex min-h-11 items-center justify-center border-4 px-4 text-center uppercase"
          >
            {copy.shame.relent}
          </Link>
          <button
            type="button"
            onClick={insist}
            className="min-h-11 px-4 text-sm underline opacity-70"
          >
            {insistLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
