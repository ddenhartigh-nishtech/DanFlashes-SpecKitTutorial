"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { cookieJar } from "@/app/_data/request";
import { signInCore, signOutCore, signUpCore } from "@/lib/actions/auth";
import type { ActionState } from "@/lib/actions/state";
import { getDb } from "@/lib/db/client";

export async function signUpAction(
  _prev: ActionState | null,
  form: FormData,
): Promise<ActionState> {
  const state = await signUpCore(getDb(), await cookieJar(), form);
  if (state.ok && state.redirectTo) {
    refresh(); // the guest cart was merged: re-render the header's cart count
    redirect(state.redirectTo);
  }
  return state;
}

export async function signInAction(
  _prev: ActionState | null,
  form: FormData,
): Promise<ActionState> {
  const state = await signInCore(getDb(), await cookieJar(), form);
  if (state.ok && state.redirectTo) {
    refresh(); // the guest cart was merged: re-render the header's cart count
    redirect(state.redirectTo);
  }
  return state;
}

export async function signOutAction(): Promise<void> {
  signOutCore(getDb(), await cookieJar());
  refresh();
  redirect("/");
}
