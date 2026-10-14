"use client";

import { useActionState, useState } from "react";
import { connectStream } from "@/actions/streams";
import type { ActionState } from "@/lib/actions/state";
import { copy } from "@/lib/copy";
import { STREAM_PRESETS, STREAM_SCHEDULES, type StreamSchedule } from "@/lib/streams/types";

const input = "border-ink bg-paper mt-1 block min-h-11 w-full border-4 px-3 font-semibold";
const label = "font-display text-sm uppercase";
const f = copy.streams.form;

/** A datetime-local value is in his own zone; the server wants ISO-8601 UTC (003 R7). */
const toIso = (local: FormDataEntryValue | null): string =>
  typeof local === "string" && local ? new Date(local).toISOString() : "";

export function ConnectStreamForm() {
  const [state, dispatch, pending] = useActionState<ActionState | null, FormData>(
    connectStream,
    null,
  );
  const [preset, setPreset] = useState<string>(STREAM_PRESETS[0]);
  const [schedule, setSchedule] = useState<StreamSchedule>("recurring");
  const [startsNow, setStartsNow] = useState(true);
  const [ongoing, setOngoing] = useState(false);

  // Convert the local inputs in the browser, the only place that knows his time zone.
  const submit = (form: FormData) => {
    form.set("startsAt", startsNow ? "" : toIso(form.get("startsLocal")));
    form.set("endsAt", toIso(form.get("endsLocal")));
    dispatch(form);
  };

  return (
    <form action={submit} className="flex flex-col gap-4">
      <h3 className="font-display text-lg">{f.heading}</h3>

      <label className={label}>
        {f.source}
        <select
          name="preset"
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
          className={input}
        >
          {STREAM_PRESETS.map((key) => (
            <option key={key} value={key}>
              {copy.streams.presets[key]}
            </option>
          ))}
          <option value="custom">{copy.streams.customOption}</option>
        </select>
      </label>
      {preset === "custom" ? (
        <label className={label}>
          {f.customName}
          <input name="customName" maxLength={40} required className={input} />
        </label>
      ) : null}

      <label className={label}>
        {f.amount}
        <input
          name="amountUsd"
          inputMode="decimal"
          placeholder="75.00"
          required
          className={input}
        />
      </label>

      <fieldset>
        <legend className={`${label} mb-1`}>{f.schedule}</legend>
        <div className="flex flex-col gap-1">
          {STREAM_SCHEDULES.map((key) => (
            <label
              key={key}
              className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold"
            >
              <input
                type="radio"
                name="schedule"
                value={key}
                checked={schedule === key}
                onChange={() => setSchedule(key)}
                className="accent-hot-pink size-5"
              />
              {copy.streams.schedules[key]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
        <input
          type="checkbox"
          checked={startsNow}
          onChange={(e) => setStartsNow(e.target.checked)}
          className="accent-hot-pink size-5"
        />
        {f.startsNow}
      </label>
      {startsNow ? null : (
        <label className={label}>
          {f.startsAt}
          <input type="datetime-local" name="startsLocal" required className={input} />
        </label>
      )}

      {schedule === "one_time" ? null : (
        <>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
            <input
              type="checkbox"
              name="ongoing"
              checked={ongoing}
              onChange={(e) => setOngoing(e.target.checked)}
              className="accent-hot-pink size-5"
            />
            {f.ongoing}
          </label>
          {ongoing ? null : (
            <label className={label}>
              {f.endsAt}
              <input type="datetime-local" name="endsLocal" className={input} />
            </label>
          )}
        </>
      )}

      <button
        type="submit"
        disabled={pending}
        className="font-display bg-hot-pink text-paper min-h-12 px-6 text-lg uppercase shadow-[4px_4px_0_var(--color-ink)] disabled:opacity-60"
      >
        {pending ? f.connecting : f.connect}
      </button>

      <div role="status" aria-live="polite" className="min-h-6">
        {state ? (
          <p
            className={`border-ink border-4 px-3 py-2 font-bold ${state.ok ? "bg-acid" : "bg-safety-orange"}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
