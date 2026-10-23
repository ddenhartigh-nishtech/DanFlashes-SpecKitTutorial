/**
 * PSSB, the Pushy Shirt Sales Bot (012): the store's side of every reply. The browser only ever
 * talks to the store; the store talks to the model (contracts/pssb.md).
 */
import { getDb } from "@/lib/db/client";
import { handlePssb } from "@/lib/pssb/handle";

export async function POST(request: Request) {
  return handlePssb(getDb(), request, { fetchImpl: fetch, env: process.env, random: Math.random });
}
