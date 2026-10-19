"use client";

import { useState } from "react";
import { createShirt, updateShirt } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { PricePreview } from "@/components/admin/PricePreview";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import type { ConsoleState } from "@/lib/admin/state";
import type { MsrpSettings, Tier } from "@/lib/catalog/types";
import { copy } from "@/lib/copy";
import type { AdminShirt, LibraryItem } from "@/lib/data/admin-shirts";

const s = copy.console.shirts;
const f = s.fields;

/** A new shirt, or an existing one's fields (008 FR-007–FR-009). The URL name is set once. */
export function ShirtForm({
  shirt,
  tiers,
  msrp,
  library,
  initial = null,
}: {
  shirt?: AdminShirt;
  tiers: Tier[];
  msrp: MsrpSettings;
  library?: LibraryItem[];
  initial?: ConsoleState | null;
}) {
  const { state, onSubmit, pending } = useConsoleAction(shirt ? updateShirt : createShirt, initial);
  const [score, setScore] = useState(shirt ? String(shirt.complexity) : "");
  const [price, setPrice] = useState(shirt?.ownerPriceUsd ?? "");

  return (
    <form onSubmit={onSubmit} className={`${ui.card} flex flex-col gap-4`}>
      {shirt ? <input type="hidden" name="id" value={shirt.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className={ui.label}>
          {f.name}
          <input
            name="name"
            defaultValue={shirt?.name}
            required
            maxLength={80}
            className={ui.input}
          />
        </label>
        <div className="flex flex-col gap-1">
          <label className={ui.label}>
            {f.slug}
            {shirt ? (
              <input value={shirt.slug} readOnly disabled className={`${ui.input} opacity-70`} />
            ) : (
              <input name="slug" required pattern="[a-z0-9-]+" className={ui.input} />
            )}
          </label>
          <span className={ui.muted}>{f.slugHelp}</span>
        </div>
        <label className={ui.label}>
          {f.style}
          <select name="style" defaultValue={shirt?.style ?? "polo"} className={ui.input}>
            <option value="polo">{copy.styles.polo}</option>
            <option value="button-down">{copy.styles["button-down"]}</option>
          </select>
        </label>
        <label className={ui.label}>
          {f.complexity}
          <input
            name="complexity"
            inputMode="numeric"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
            className={ui.input}
          />
        </label>
        <div className="flex flex-col gap-1">
          <label className={ui.label}>
            {f.finalPrice}
            <input
              name="finalPriceUsd"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={ui.input}
            />
          </label>
          <span className={ui.muted}>{f.finalPriceHelp}</span>
        </div>
        <PricePreview score={score} price={price} tiers={tiers} msrp={msrp} />
      </div>
      <label className={ui.label}>
        {f.description}
        <textarea
          name="description"
          defaultValue={shirt?.description}
          required
          rows={3}
          className={ui.input}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={shirt?.featured} />
        {f.featured}
      </label>
      {library ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className={ui.label}>
            {f.mainImage}
            <select name="mainMediaId" defaultValue="" className={ui.input}>
              <option value="">{f.noImage}</option>
              {library.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.alt}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" name="active" />
            {f.live}
          </label>
        </div>
      ) : null}
      <ConsoleMessage state={state} />
      <div>
        <button type="submit" disabled={pending} className={ui.primary}>
          {pending ? copy.console.working : s.save}
        </button>
      </div>
    </form>
  );
}
