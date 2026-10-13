"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { cookieJar } from "@/app/_data/request";
import { placeOrderCore } from "@/lib/actions/checkout";
import type { ActionState } from "@/lib/actions/state";
import { getDb } from "@/lib/db/client";

export async function placeOrderAction(
  _prev: ActionState | null,
  form: FormData,
): Promise<ActionState> {
  const state = placeOrderCore(getDb(), await cookieJar(), form);
  if (state.ok && state.redirectTo) redirect(state.redirectTo);
  if (!state.ok && state.code === "GATE_SIGN_IN_REQUIRED") redirect("/sign-in?next=/checkout");
  // Re-render so a changed price, audited line, or new balance shows immediately.
  if (!state.ok) refresh();
  return state;
}
