"use server";

import { refresh } from "next/cache";
import { cookieJar } from "@/app/_data/request";
import { topUpCore } from "@/lib/actions/flash-credit";
import type { ActionState } from "@/lib/actions/state";
import { getDb } from "@/lib/db/client";

export async function topUpFlashCredit(
  _prev: ActionState | null,
  form: FormData,
): Promise<ActionState> {
  const state = topUpCore(getDb(), await cookieJar(), form);
  if (state.ok) refresh();
  return state;
}
