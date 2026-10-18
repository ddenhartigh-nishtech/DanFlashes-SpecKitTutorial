"use client";

import { createAddOn, manageAddOn } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import { copy } from "@/lib/copy";
import type { AdminAddOn } from "@/lib/data/add-ons";

const a = copy.console.addOns;

function Fields({ addOn }: { addOn?: AdminAddOn }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={ui.label}>
        {a.name}
        <input name="name" defaultValue={addOn?.name} maxLength={60} className={ui.input} />
      </label>
      <label className={ui.label}>
        {a.price}
        <input
          name="priceUsd"
          defaultValue={addOn?.priceUsd}
          inputMode="decimal"
          className={ui.input}
        />
      </label>
      <label className={ui.label}>
        {a.pitch}
        <input name="pitch" defaultValue={addOn?.pitch} maxLength={160} className={ui.input} />
      </label>
      <label className={ui.label}>
        {a.declineLine}
        <input
          name="declineLine"
          defaultValue={addOn?.declineLine}
          maxLength={160}
          className={ui.input}
        />
      </label>
    </div>
  );
}

/** One add-on: its words and price, offered or retired, and its place in line (008 FR-031). */
export function AddOnRow({
  addOn,
  first,
  last,
}: {
  addOn: AdminAddOn;
  first: boolean;
  last: boolean;
}) {
  const { state, onSubmit, pending } = useConsoleAction(manageAddOn);
  return (
    <li data-testid="add-on-row" data-name={addOn.name} className={ui.card}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={addOn.id} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            data-testid="add-on-status"
            className={`text-sm font-medium ${addOn.active ? "text-office-sage" : "text-office-muted"}`}
          >
            {addOn.active ? a.offered : a.retired}
          </span>
          <span className="flex flex-wrap gap-1">
            <button name="op" value="up" disabled={pending || first} className={ui.button}>
              {a.up}
            </button>
            <button name="op" value="down" disabled={pending || last} className={ui.button}>
              {a.down}
            </button>
            <button
              name="op"
              value={addOn.active ? "retire" : "restore"}
              disabled={pending}
              className={ui.button}
            >
              {addOn.active ? a.retire : a.restore}
            </button>
          </span>
        </div>
        <Fields addOn={addOn} />
        <ConsoleMessage state={state} />
        <div>
          <button name="op" value="save" disabled={pending} className={ui.primary}>
            {a.save}
          </button>
        </div>
      </form>
    </li>
  );
}

/** A new add-on, offered at the end of checkout's list. */
export function AddOnCreate() {
  const { state, onSubmit, pending } = useConsoleAction(createAddOn);
  return (
    <form
      data-testid="add-on-create"
      onSubmit={onSubmit}
      className={`${ui.card} flex flex-col gap-3`}
    >
      <h2 className={ui.h2}>{a.createTitle}</h2>
      <Fields />
      <ConsoleMessage state={state} />
      <div>
        <button type="submit" disabled={pending} className={ui.primary}>
          {a.create}
        </button>
      </div>
    </form>
  );
}
