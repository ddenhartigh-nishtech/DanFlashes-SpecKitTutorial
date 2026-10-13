"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { addToCart } from "@/actions/cart";
import { ShameDialog } from "@/components/ShameDialog";
import type { ActionState } from "@/lib/actions/state";
import { SIZES } from "@/lib/catalog/types";
import { copy } from "@/lib/copy";
import type { Shame } from "@/lib/shaming/loop";

interface AddToCartProps {
  slug: string;
  /** Set for a BLAND shirt while shaming is on: Add to Cart opens the loop instead (002 US1). */
  shame?: Shame | null;
  placeholderUrl?: string | null;
}

export function AddToCart({ slug, shame = null, placeholderUrl = null }: AddToCartProps) {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(addToCart, null);
  /** Bumped on every attempt, so each one mounts a fresh loop starting at round 1. */
  const [attempt, setAttempt] = useState<number | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // Without a size, let the store answer with 001's SIZE_REQUIRED message.
    if (!shame || !new FormData(event.currentTarget).get("size")) return;
    event.preventDefault();
    setAttempt((n) => (n ?? 0) + 1);
  }

  return (
    <form action={action} onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <fieldset>
        <legend className="font-display mb-2 text-sm uppercase">{copy.product.size}</legend>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => (
            <label key={size} className="cursor-pointer">
              <input type="radio" name="size" value={size} className="peer sr-only" />
              <span className="font-display border-ink bg-paper peer-checked:bg-ink peer-checked:text-highlighter peer-focus-visible:outline-ultraviolet flex min-h-11 min-w-14 items-center justify-center border-4 px-3 peer-focus-visible:outline-4">
                {size}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="font-display bg-hot-pink text-paper min-h-12 px-6 text-lg uppercase shadow-[4px_4px_0_var(--color-ink)] disabled:opacity-60"
      >
        {pending ? copy.product.adding : copy.product.addToCart}
      </button>

      <div role="status" aria-live="polite" className="min-h-6">
        {state?.ok === false ? (
          <p className="bg-safety-orange border-ink border-4 px-3 py-2 font-bold">
            {state.message}
          </p>
        ) : null}
        {state?.ok ? (
          <p className="bg-acid border-ink flex flex-wrap items-center gap-3 border-4 px-3 py-2 font-bold">
            {state.message}
            <Link href="/cart" className="underline">
              {copy.product.viewCart}
            </Link>
          </p>
        ) : null}
      </div>

      {shame && attempt !== null ? (
        <ShameDialog
          key={attempt}
          ladder={shame.ladder}
          insistLabel={shame.insistLabel}
          placeholderUrl={placeholderUrl}
          onClose={() => setAttempt(null)}
        />
      ) : null}
    </form>
  );
}
