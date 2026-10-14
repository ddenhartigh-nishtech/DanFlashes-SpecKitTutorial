/**
 * Developer diagnostics: say what's broken, and how to fix it, in the terminal running the server.
 * Shoppers still just see the 500 page; the browser console points back here.
 */
import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { databasePath } = await import("@/lib/db/client");
  const { startupProblems } = await import("@/lib/db/health");
  for (const problem of startupProblems(databasePath())) console.error(`[Dan Flashes] ${problem}`);
}

/** Fixes printed in the last few seconds: one broken page fails in several sections at once. */
const recentFixes = new Map<string, number>();

/** Next already logs every server error; add the fix when it's one we recognize. */
export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { diagnose } = await import("@/lib/db/health");
  const fix = diagnose(error);
  if (!fix) return;
  const now = Date.now();
  if (now - (recentFixes.get(fix) ?? 0) < 5_000) return;
  recentFixes.set(fix, now);
  console.error(`[Dan Flashes] ${request.method} ${request.path}: ${fix}`);
};
