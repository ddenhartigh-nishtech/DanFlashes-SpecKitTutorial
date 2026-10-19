import "server-only";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSettings } from "@/lib/data/settings";
import { getDb } from "@/lib/db/client";
import { buildDial } from "@/lib/pattern/dial-view";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The dial for this request (007 R4), or the store's 404 while the generator is off. */
export async function loadDial(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
) {
  await connection();
  const query = await searchParams;
  const db = getDb();
  const view = buildDial(db, { r: one(query.r), seed: one(query.seed), style: one(query.style) });
  if (!view) notFound();
  return { view, blandShaming: getSettings(db).blandShaming };
}

/** Whether to show the way to the dial (the shirts page and the home page). */
export async function dialIsOn(): Promise<boolean> {
  await connection();
  return getSettings(getDb()).patternGenerator;
}
