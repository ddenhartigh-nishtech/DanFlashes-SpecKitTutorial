"use client";

import { useEffect, useRef } from "react";
import { uploadMedia } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import { copy } from "@/lib/copy";

const m = copy.console.media;

/** A new picture for the library (008 FR-023). The store checks the bytes, not the name. */
export function UploadForm() {
  const { state, onSubmit, pending } = useConsoleAction(uploadMedia);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset(); // saved: clear it for the next one
  }, [state]);

  return (
    <form
      ref={form}
      data-testid="upload-form"
      onSubmit={onSubmit}
      className={`${ui.card} flex flex-col gap-3`}
    >
      <h2 className={ui.h2}>{m.uploadTitle}</h2>
      <p className={ui.muted}>{m.uploadHelp}</p>
      <label className={ui.label}>
        {m.file}
        <input
          type="file"
          name="file"
          required
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="text-sm"
        />
      </label>
      <label className={ui.label}>
        {m.alt}
        <input name="alt" required maxLength={200} className={ui.input} />
      </label>
      <ConsoleMessage state={state} />
      <div>
        <button type="submit" disabled={pending} className={ui.primary}>
          {pending ? copy.console.working : m.upload}
        </button>
      </div>
    </form>
  );
}
