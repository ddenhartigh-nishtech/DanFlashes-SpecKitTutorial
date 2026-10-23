/**
 * PSSB's controls in Dan's Office (012 US5, FR-019, R10): where his model lives (blank: the code's
 * default), Dan's support email (blank: PSSB invents an excuse), and a Test that asks the model
 * something small and reports, calmly. Each saves only its own columns (008 R11).
 */
import { asAdmin, problems, refused, saved, text, type ConsoleState } from "@/lib/admin/state";
import { pssbModelName, pssbModelUrl, supportEmail } from "@/lib/catalog/validate";
import { copy } from "@/lib/copy";
import { getSettings, savePssbModel, saveSupportEmail } from "@/lib/data/settings";
import type { Db } from "@/lib/db/client";
import type { CookieJar } from "@/lib/http/cookies";
import { pssbEndpoint } from "@/lib/pssb/endpoint";
import { stableFacts } from "@/lib/pssb/facts";
import { streamChat, warm } from "@/lib/pssb/ollama";

const t = copy.console.settings.pssb;

export function savePssbCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const url = text(form, "modelUrl").trim();
  const model = text(form, "model").trim();
  const issues = [];
  if (url && !pssbModelUrl.safeParse(url).success)
    issues.push({ field: "modelUrl", message: t.urlFormat });
  if (model && !pssbModelName.safeParse(model).success)
    issues.push({ field: "model", message: t.modelFormat });
  if (issues.length) return problems(issues);
  savePssbModel(db, { url: url || null, model: model || null });
  return saved();
}

export function saveSupportEmailCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const email = text(form, "supportEmail").trim();
  if (email && !supportEmail.safeParse(email).success) {
    return problems([{ field: "supportEmail", message: t.emailFormat }]);
  }
  saveSupportEmail(db, email || null);
  return saved();
}

export interface PssbTestDeps {
  fetchImpl: typeof fetch;
  env: Record<string, string | undefined>;
}

/** Ask the model for five words (8 s at most), report it, and warm it for the store (R6). */
export async function testPssbCore(
  db: Db,
  jar: CookieJar,
  _form: FormData,
  deps: PssbTestDeps = { fetchImpl: fetch, env: process.env },
): Promise<ConsoleState> {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const endpoint = pssbEndpoint(getSettings(db), deps.env);
  const started = Date.now();
  let reply = "";
  try {
    for await (const chunk of streamChat(
      endpoint,
      [
        { role: "system", content: "You are PSSB, a pushy shirt salesman. Answer in five words." },
        { role: "user", content: "Say hello in five words." },
      ],
      { fetchImpl: deps.fetchImpl, firstWordMs: 8_000, totalMs: 8_000 },
    )) {
      reply += chunk;
    }
  } catch (error) {
    return refused(
      t.noAnswer(endpoint.url, error instanceof Error ? error.message : String(error)),
    );
  }
  void warm(endpoint, stableFacts(db).text, { fetchImpl: deps.fetchImpl });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  return saved(t.answered(seconds, reply.trim()));
}
