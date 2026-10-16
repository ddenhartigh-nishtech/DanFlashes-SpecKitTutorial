"use client";

import { useActionState } from "react";
import { updateCartItem } from "@/actions/cart";
import { ConfirmTwice } from "@/components/ConfirmTwice";
import type { ActionState } from "@/lib/actions/state";
import { MAX_QUANTITY } from "@/lib/cart/limits";
import { needsConfirm } from "@/lib/cart/roach-motel";
import { copy } from "@/lib/copy";

/**
 * Quantity is 1–99 in the UI (Remove handles zero); the server re-validates regardless. Lowering it
 * goes through the roach motel first (005 US2).
 */
export function CartQuantityForm({
  slug,
  size,
  quantity,
  roachMotel,
  lowerYesLabel,
}: {
  slug: string;
  size: string;
  quantity: number;
  roachMotel: boolean;
  lowerYesLabel: string;
}) {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(
    updateCartItem,
    null,
  );

  const lowering = (form: HTMLFormElement) =>
    needsConfirm(
      { kind: "update", current: quantity, next: Number(new FormData(form).get("quantity")) },
      roachMotel,
    );

  return (
    <ConfirmTwice enabled={roachMotel} yesLabel={lowerYesLabel} when={lowering}>
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
        {state?.ok && state.message ? (
          <p role="status" className="bg-acid border-ink border-2 px-2 text-sm font-bold">
            {state.message}
          </p>
        ) : null}
      </form>
    </ConfirmTwice>
  );
}
