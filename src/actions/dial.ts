"use server";

import { redirect } from "next/navigation";
import { makeItMineCore, type MakeItMineState } from "@/lib/actions/dial";
import { getDb } from "@/lib/db/client";

/** The dial's "Make it mine": straight to the shirt's own page (007 R5). */
export async function makeItMine(_prev: MakeItMineState | null, form: FormData) {
  const state = makeItMineCore(getDb(), form);
  if (state.ok) redirect(`/shirts/${state.slug}`);
  return state;
}
