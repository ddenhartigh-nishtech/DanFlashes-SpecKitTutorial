"use client";

import { useState } from "react";
import { saveTuning } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import type { MsrpSettings } from "@/lib/catalog/types";
import { copy } from "@/lib/copy";
import { cmp, formatUsd, tryParseUsd } from "@/lib/money";
import { msrpUsd } from "@/lib/pricing/msrp";

const t = copy.console.settings.tuning;

/** An MSRP for a score under some dials, or a dash when the dials (or the score) can't price it. */
function price(score: number, msrp: MsrpSettings | null): string {
  if (!msrp) return "—";
  try {
    return formatUsd(msrpUsd(score, msrp));
  } catch {
    return copy.console.shirts.preview.cantPrice;
  }
}

/**
 * The MSRP dials (008 FR-014), with every active shirt's MSRP now and after, worked out by the
 * store's own `msrpUsd` as Dan types. The formula itself isn't a setting.
 */
export function TuningForm({
  msrp,
  shirts,
}: {
  msrp: MsrpSettings;
  shirts: { id: number; name: string; complexity: number }[];
}) {
  const { state, onSubmit, pending } = useConsoleAction(saveTuning);
  const [start, setStart] = useState(msrp.startPriceUsd);
  const [anchor, setAnchor] = useState(String(msrp.anchorScore));
  const [interval, setInterval] = useState(String(msrp.doublingInterval));

  const startUsd = tryParseUsd(start.trim());
  const proposed: MsrpSettings | null =
    startUsd !== null &&
    cmp(startUsd, "0.01") >= 0 &&
    /^\d+$/.test(anchor.trim()) &&
    /^\d+$/.test(interval.trim()) &&
    Number(interval) >= 1
      ? { startPriceUsd: startUsd, anchorScore: Number(anchor), doublingInterval: Number(interval) }
      : null;

  return (
    <form onSubmit={onSubmit} className={`${ui.card} flex flex-col gap-4`}>
      <div>
        <h2 className={ui.h2}>{t.title}</h2>
        <p className={ui.muted}>{t.help}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={ui.label}>
          {t.start}
          <input
            name="startPriceUsd"
            inputMode="decimal"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={ui.input}
          />
        </label>
        <label className={ui.label}>
          {t.anchor}
          <input
            name="anchorScore"
            inputMode="numeric"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
            className={ui.input}
          />
        </label>
        <label className={ui.label}>
          {t.interval}
          <input
            name="doublingInterval"
            inputMode="numeric"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className={ui.input}
          />
        </label>
      </div>
      <div className="max-h-80 overflow-y-auto">
        <table className={ui.table}>
          <thead>
            <tr>
              <th className={ui.th}>{t.shirt}</th>
              <th className={ui.th}>{t.now}</th>
              <th className={ui.th}>{t.after}</th>
            </tr>
          </thead>
          <tbody>
            {shirts.map((shirt) => (
              <tr key={shirt.id} data-testid="tuning-row">
                <td className={`${ui.td} break-words`}>{shirt.name}</td>
                <td data-testid="msrp-now" className={`${ui.td} break-all`}>
                  {price(shirt.complexity, msrp)}
                </td>
                <td data-testid="msrp-after" className={`${ui.td} break-all`}>
                  {price(shirt.complexity, proposed)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConsoleMessage state={state} />
      <div>
        <button type="submit" disabled={pending} className={ui.primary}>
          {t.save}
        </button>
      </div>
    </form>
  );
}
