/**
 * Where PSSB's model lives (012 R1, R10, Q5): this machine's Ollama by default, overridden by the
 * environment (PSSB_MODEL_URL, PSSB_MODEL), and those by Dan's Settings. A blank override falls
 * through to the next.
 */
import type { StoreSettings } from "@/lib/catalog/types";

export interface PssbEndpoint {
  url: string;
  model: string;
}

/** Benchmarked on this machine (R1): fast enough on its CPU, and convincingly PSSB. */
export const DEFAULT_PSSB: PssbEndpoint = { url: "http://localhost:11434", model: "llama3.2:3b" };

const pick = (...values: (string | null | undefined)[]) =>
  values.map((v) => v?.trim()).find((v): v is string => !!v);

export function pssbEndpoint(
  settings: Pick<StoreSettings, "pssbModelUrl" | "pssbModel">,
  env: Record<string, string | undefined> = process.env,
): PssbEndpoint {
  const url = pick(settings.pssbModelUrl, env.PSSB_MODEL_URL) ?? DEFAULT_PSSB.url;
  return {
    url: url.replace(/\/+$/, ""),
    model: pick(settings.pssbModel, env.PSSB_MODEL) ?? DEFAULT_PSSB.model,
  };
}
