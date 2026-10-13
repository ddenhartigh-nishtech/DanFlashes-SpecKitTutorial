"use client";

import { useActionState } from "react";
import { updateCartItem } from "@/actions/cart";
import type { ActionState } from "@/lib/actions/state";
import { MAX_QUANTITY } from "@/lib/cart/limits";
import { copy } from "@/lib/copy";

/** Quantity is 1–99 in the UI (Remove handles zero); the server re-validates regardless. */
export function CartQuantityForm({
  slug,
  size,
  quantity,
}: {
  slug: string;
  size: string;
  quantity: number;
}) {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(
    updateCartItem,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-1">
      <div className="flex items-end gap-2">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="size" value={size} />
        <label className="font-display text-xs uppercase">
          {copy.cart.quantity}
          <input
            type="number"
            name="quantity"
            inputMode="numeric"
            min={1}
            max={MAX_QUANTITY}
            step={1}
            required
            defaultValue={quantity}
            className="border-ink bg-paper mt-1 block min-h-11 w-20 border-4 px-2 font-bold"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="font-display border-ink min-h-11 border-4 px-3 text-sm uppercase disabled:opacity-60"
        >
          {copy.cart.update}
        </button>
      </div>
      {state && !state.ok ? (
        <p role="status" className="bg-safety-orange border-ink border-2 px-2 text-sm font-bold">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
