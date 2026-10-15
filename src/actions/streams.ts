"use server";

import { refresh } from "next/cache";
import { cookieJar } from "@/app/_data/request";
import {
  cashInCore,
  connectStreamCore,
  disconnectStreamCore,
  dismissDrainCore,
} from "@/lib/actions/streams";
import type { ActionState } from "@/lib/actions/state";
import { getDb } from "@/lib/db/client";

export async function connectStream(
  _prev: ActionState | null,
  form: FormData,
): Promise<ActionState> {
  const state = connectStreamCore(getDb(), await cookieJar(), form);
  if (state.ok) refresh();
  return state;
}

export async function cashIn(_prev: ActionState | null, form: FormData): Promise<ActionState> {
  const state = cashInCore(getDb(), await cookieJar(), form);
  if (state.ok) refresh();
  return state;
}

/** A plain form action (no state to show): the list re-renders with the stream disconnected. */
export async function disconnectStream(form: FormData): Promise<void> {
  const state = disconnectStreamCore(getDb(), await cookieJar(), form);
  if (state.ok) refresh();
}

/** The (x) on a GONE pop (003 R13): a plain form action; the corner re-renders without it. */
export async function dismissDrain(form: FormData): Promise<void> {
  const state = dismissDrainCore(getDb(), await cookieJar(), form);
  if (state.ok) refresh();
}
