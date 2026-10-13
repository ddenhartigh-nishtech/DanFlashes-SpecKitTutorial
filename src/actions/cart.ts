"use server";

import { refresh } from "next/cache";
import { cookieJar } from "@/app/_data/request";
import { addToCartCore, removeCartItemCore, updateCartItemCore } from "@/lib/actions/cart";
import type { ActionState } from "@/lib/actions/state";
import { getDb } from "@/lib/db/client";

export async function addToCart(_prev: ActionState | null, form: FormData): Promise<ActionState> {
  const state = addToCartCore(getDb(), await cookieJar(), form);
  if (state.ok) refresh();
  return state;
}

export async function updateCartItem(
  _prev: ActionState | null,
  form: FormData,
): Promise<ActionState> {
  const state = updateCartItemCore(getDb(), await cookieJar(), form);
  if (state.ok) refresh();
  return state;
}

export async function removeCartItem(form: FormData): Promise<void> {
  removeCartItemCore(getDb(), await cookieJar(), form);
  refresh();
}
