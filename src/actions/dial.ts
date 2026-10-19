"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@/app/_data/request";
import { makeItMineCore, type MakeItMineState } from "@/lib/actions/dial";
import { getDb } from "@/lib/db/client";

/** The dial's "Make it mine": straight to the shirt's own page, or to sign in first (007 R5, R14). */
export async function makeItMine(_prev: MakeItMineState | null, form: FormData) {
  const user = await currentUser();
  const state = makeItMineCore(getDb(), form, user?.id ?? null);
  if (state.ok) redirect(`/shirts/${state.slug}`);
  if ("signIn" in state) redirect(`/sign-in?next=${encodeURIComponent(state.signIn)}`);
  return state;
}
