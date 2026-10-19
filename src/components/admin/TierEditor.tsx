"use client";

import { useState } from "react";
import { saveTiers } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import { tierChanges, type TierDraft } from "@/lib/admin/tiers";
import { tierOf } from "@/lib/catalog/tiers";
import type { Tier } from "@/lib/catalog/types";
import { copy } from "@/lib/copy";

const t = copy.console.tiers;

interface Row {
  key: string;
  id?: number;
  name: string;
  tagline: string;
  minScore: string;
  badgeBgColor: string;
  badgeTextColor: string;
}

const rowsOf = (tiers: Tier[]): Row[] =>
  tiers.map((tier) => ({
    key: `tier-${tier.id}`,
    id: tier.id,
    name: tier.name,
    tagline: tier.tagline ?? "",
    minScore: String(tier.minScore),
    badgeBgColor: tier.badgeBgColor,
    badgeTextColor: tier.badgeTextColor,
  }));

/** A whole number start, or -1 so the rules can say what's wrong with it. */
const start = (raw: string) => (/^\d+$/.test(raw.trim()) ? Number(raw.trim()) : -1);

/**
 * The tiers, edited as one set and saved at once (008 FR-027–FR-029, R9). The preview of which
 * shirts change tier runs the same rules the save does. BLAND keeps its name and its start.
 */
export function TierEditor({
  tiers,
  shirts,
}: {
  tiers: Tier[];
  shirts: { id: number; name: string; complexity: number }[];
}) {
  const { state, onSubmit, pending } = useConsoleAction(saveTiers);
  const [rows, setRows] = useState<Row[]>(() => rowsOf(tiers));
  const [added, setAdded] = useState(0);
  // After a save the store sends fresh tiers (new ones now have ids): start over from those.
  const [shown, setShown] = useState(tiers);
  if (shown !== tiers) {
    setShown(tiers);
    setRows(rowsOf(tiers));
  }

  const drafts: TierDraft[] = rows.map((r) => ({
    ...(r.id !== undefined ? { id: r.id } : {}),
    name: r.name,
    tagline: r.tagline.trim() || null,
    minScore: start(r.minScore),
    badgeBgColor: r.badgeBgColor,
    badgeTextColor: r.badgeTextColor,
  }));
  const usable = drafts.every((d) => d.minScore >= 0);
  const changes = usable ? tierChanges(shirts, tiers, drafts) : [];
  const starts = [...new Set(drafts.map((d) => d.minScore).filter((n) => n >= 0))].sort(
    (a, b) => a - b,
  );
  const count = (d: TierDraft) =>
    usable && drafts.some((x) => x.minScore === 0)
      ? shirts.filter(
          (s) =>
            tierOf(
              s.complexity,
              drafts.map((x, i) => ({ ...x, id: i })),
            ).minScore === d.minScore,
        ).length
      : null;
  const edit = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const blandId = tiers.find((tier) => tier.minScore === 0)?.id;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="tiers" value={JSON.stringify(drafts)} />
      <ul className="flex flex-col gap-3">
        {rows.map((row, i) => {
          const bland = row.id !== undefined && row.id === blandId;
          const d = drafts[i];
          const next = starts.find((n) => n > d.minScore) ?? null;
          const shirtsHere = count(d);
          return (
            <li key={row.key} data-testid="tier-row" className={`${ui.card} flex flex-col gap-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="inline-block rounded px-2 py-0.5 text-sm font-medium"
                  style={{ backgroundColor: row.badgeBgColor, color: row.badgeTextColor }}
                >
                  {row.name || "…"}
                </span>
                <span className={ui.muted}>
                  {d.minScore >= 0 ? t.band(d.minScore, next) : null}
                  {shirtsHere !== null ? ` · ${t.activeShirts(shirtsHere)}` : null}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_3fr_1fr_auto_auto]">
                <label className={ui.label}>
                  {t.name}
                  <input
                    value={row.name}
                    onChange={(e) => edit(row.key, { name: e.target.value })}
                    disabled={bland}
                    maxLength={40}
                    className={ui.input}
                  />
                </label>
                <label className={ui.label}>
                  {t.tagline}
                  <input
                    value={row.tagline}
                    onChange={(e) => edit(row.key, { tagline: e.target.value })}
                    maxLength={120}
                    className={ui.input}
                  />
                </label>
                <label className={ui.label}>
                  {t.start}
                  <input
                    value={row.minScore}
                    onChange={(e) => edit(row.key, { minScore: e.target.value })}
                    disabled={bland}
                    inputMode="numeric"
                    className={ui.input}
                  />
                </label>
                <label className={ui.label}>
                  {t.background}
                  <input
                    type="color"
                    value={row.badgeBgColor.toLowerCase()}
                    onChange={(e) => edit(row.key, { badgeBgColor: e.target.value })}
                    className="h-10 w-16"
                  />
                </label>
                <label className={ui.label}>
                  {t.text}
                  <input
                    type="color"
                    value={row.badgeTextColor.toLowerCase()}
                    onChange={(e) => edit(row.key, { badgeTextColor: e.target.value })}
                    className="h-10 w-16"
                  />
                </label>
              </div>
              {bland ? (
                <p className={ui.muted}>{t.blandNote}</p>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                    className={ui.button}
                  >
                    {t.remove}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div>
        <button
          type="button"
          onClick={() => {
            setAdded((n) => n + 1);
            setRows((current) => [
              ...current,
              {
                key: `new-${added}`,
                name: "",
                tagline: "",
                minScore: "",
                badgeBgColor: "#6f8a7f",
                badgeTextColor: "#ffffff",
              },
            ]);
          }}
          className={ui.button}
        >
          {t.add}
        </button>
      </div>
      <section data-testid="tier-preview" className={`${ui.card} flex flex-col gap-2`}>
        <h2 className={ui.h2}>{t.previewTitle}</h2>
        {changes.length === 0 ? (
          <p className={ui.muted}>{t.noChanges}</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {changes.map(({ shirt, from, to }) => (
              <li key={shirt.id}>{t.moves(shirt.name, from, to)}</li>
            ))}
          </ul>
        )}
      </section>
      <ConsoleMessage state={state} />
      <div>
        <button type="submit" disabled={pending} className={ui.primary}>
          {t.save}
        </button>
      </div>
    </form>
  );
}
