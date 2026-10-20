"use client";

import { useState } from "react";
import { saveTuning } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import { sortTiers } from "@/lib/catalog/tiers";
import type { MsrpSettings, Tier } from "@/lib/catalog/types";
import { copy } from "@/lib/copy";
import { cmp, formatUsd, tryParseUsd, type Usd } from "@/lib/money";
import { msrpUsd, realShirtStartUsd } from "@/lib/pricing/msrp";

const t = copy.console.settings.tuning;

/** Dollars and cents of at least $0.01, as typed, or null. */
function dial(raw: string): Usd | null {
  const usd = tryParseUsd(raw.trim());
  return usd !== null && cmp(usd, "0.01") >= 0 ? usd : null;
}

/**
 * The MSRP dials (008 FR-014, 010 FR-013): the base price and the price per point, what a real
 * shirt starts at, and every active shirt's MSRP now and after, worked out by the store's own
 * `msrpUsd` as Dan types. The formula itself isn't a setting.
 */
export function TuningForm({
  msrp,
  tiers,
  shirts,
}: {
  msrp: MsrpSettings;
  tiers: Tier[];
  shirts: { id: number; name: string; complexity: number }[];
}) {
  const { state, onSubmit, pending } = useConsoleAction(saveTuning);
  const [base, setBase] = useState(msrp.basePriceUsd);
  const [perPoint, setPerPoint] = useState(msrp.perPointUsd);

  const baseUsd = dial(base);
  const perPointUsd = dial(perPoint);
  const proposed: MsrpSettings | null =
    baseUsd !== null && perPointUsd !== null ? { basePriceUsd: baseUsd, perPointUsd } : null;
  const firstReal = sortTiers(tiers)[1];
  const start = proposed ? realShirtStartUsd(tiers, proposed) : null;
  const price = (score: number, dials: MsrpSettings | null) =>
    dials ? formatUsd(msrpUsd(score, dials)) : "—";

  return (
    <form onSubmit={onSubmit} className={`${ui.card} flex flex-col gap-4`}>
      <div>
        <h2 className={ui.h2}>{t.title}</h2>
        <p className={ui.muted}>{t.help}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={ui.label}>
          {t.base}
          <input
            name="basePriceUsd"
            inputMode="decimal"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            className={ui.input}
          />
        </label>
        <label className={ui.label}>
          {t.perPoint}
          <input
            name="perPointUsd"
            inputMode="decimal"
            value={perPoint}
            onChange={(e) => setPerPoint(e.target.value)}
            className={ui.input}
          />
        </label>
      </div>
      {start && firstReal ? (
        <p data-testid="real-shirt-start" className={ui.muted}>
          {t.startsAt(formatUsd(start), firstReal.name, firstReal.minScore)}
        </p>
      ) : null}
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
