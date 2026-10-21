"use client";

import { savePssb, saveSupportEmail, testPssb } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import { copy } from "@/lib/copy";

const t = copy.console.settings.pssb;

/**
 * PSSB in Dan's Office (012 US5, FR-019): where his model lives (blank uses what's in effect), a
 * Test, and Dan's support email. Calm, like the rest of the office: PSSB himself never appears here.
 */
export function PssbForm({
  modelUrl,
  model,
  inEffect,
  supportEmail,
}: {
  modelUrl: string | null;
  model: string | null;
  inEffect: { url: string; model: string };
  supportEmail: string | null;
}) {
  const save = useConsoleAction(savePssb);
  const test = useConsoleAction(testPssb);
  const email = useConsoleAction(saveSupportEmail);
  return (
    <section data-testid="pssb-settings" className={`${ui.card} flex flex-col gap-4`}>
      <div>
        <h2 className={ui.h2}>{t.title}</h2>
        <p className={ui.muted}>{t.help}</p>
        <p data-testid="pssb-in-effect" className={ui.muted}>
          {t.inEffect(inEffect.url, inEffect.model)}
        </p>
      </div>

      <form onSubmit={save.onSubmit} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={ui.label}>
            {t.modelUrl}
            <input
              name="modelUrl"
              defaultValue={modelUrl ?? ""}
              placeholder={inEffect.url}
              inputMode="url"
              className={ui.input}
            />
          </label>
          <label className={ui.label}>
            {t.model}
            <input
              name="model"
              defaultValue={model ?? ""}
              placeholder={inEffect.model}
              className={ui.input}
            />
          </label>
        </div>
        <ConsoleMessage state={save.state} />
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={save.pending} className={ui.primary}>
            {t.save}
          </button>
        </div>
      </form>

      <form onSubmit={test.onSubmit} className="flex flex-col gap-2">
        <div role="status" data-testid="pssb-test-result">
          <ConsoleMessage state={test.state} />
        </div>
        <div>
          <button type="submit" disabled={test.pending} className={ui.button}>
            {test.pending ? t.testing : t.test}
          </button>
        </div>
      </form>

      <form onSubmit={email.onSubmit} className="flex flex-col gap-2">
        <label className={ui.label}>
          {t.supportEmail}
          <input
            name="supportEmail"
            type="email"
            defaultValue={supportEmail ?? ""}
            aria-describedby="support-email-help"
            className={ui.input}
          />
        </label>
        <p id="support-email-help" className={ui.muted}>
          {t.supportHelp}
        </p>
        <ConsoleMessage state={email.state} />
        <div>
          <button type="submit" disabled={email.pending} className={ui.primary}>
            {t.saveEmail}
          </button>
        </div>
      </form>
    </section>
  );
}
