"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { copy } from "@/lib/copy";

const r = copy.roachMotel;

/**
 * The roach-motel gate (005 US2, R5). It sits in front of a form: while `enabled`, and `when` says
 * so, a submit is held back for "Are you sure?" and then "Are you sure sure?". Only the second yes
 * lets that submit through. Keep, Escape or the backdrop backs out, and the form goes back to how
 * it was. The server's actions are untouched: this is friction, not a rule.
 */
export function ConfirmTwice({
  enabled,
  yesLabel,
  when,
  children,
}: {
  enabled: boolean;
  /** The yes button, labelled by confirmshaming (002). */
  yesLabel: string;
  /** Whether this submit needs the questions. Always, when omitted. */
  when?: (form: HTMLFormElement) => boolean;
  children: ReactNode;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const held = useRef<HTMLFormElement | null>(null);
  const letThrough = useRef(false);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (step > 0 && !el.open) el.showModal();
    if (step === 0 && el.open) el.close();
  }, [step]);

  // Close on unmount: Next keeps hidden routes mounted, and an open modal would trap them (002 R7).
  useEffect(() => {
    const el = dialog.current;
    return () => {
      if (el?.open) el.close();
    };
  }, []);

  const onSubmitCapture = (event: FormEvent<HTMLDivElement>) => {
    const form = event.target as HTMLFormElement;
    if (letThrough.current) {
      letThrough.current = false;
      return;
    }
    if (!enabled || (when && !when(form))) return;
    event.preventDefault(); // React skips a form action whose submit was prevented
    held.current = form;
    setStep(1);
  };

  const keep = () => {
    held.current?.reset();
    held.current = null;
    setStep(0);
  };

  const yes = () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    const form = held.current;
    held.current = null;
    setStep(0);
    letThrough.current = true;
    form?.requestSubmit();
  };

  return (
    <div className="contents" onSubmitCapture={onSubmitCapture}>
      {children}
      <dialog
        data-steady
        ref={dialog}
        data-testid={step > 0 ? "roach-motel" : undefined}
        onCancel={(event) => {
          event.preventDefault();
          keep();
        }}
        onClick={(event) => {
          if (event.target === dialog.current) keep(); // the backdrop
        }}
        className="border-ink bg-paper text-ink m-auto w-[min(24rem,calc(100vw-2rem))] border-4 p-0 shadow-[8px_8px_0_var(--color-hot-pink)] backdrop:bg-black/70"
      >
        <div className="flex flex-col gap-4 p-5">
          <p className="font-display text-highlighter solid-backing px-3 py-2 text-2xl leading-tight">
            {step === 2 ? r.second : r.first}
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              autoFocus
              onClick={keep}
              className="font-display bg-hot-pink text-paper min-h-12 px-4 text-lg uppercase shadow-[4px_4px_0_var(--color-ink)]"
            >
              {r.keep}
            </button>
            <button
              type="button"
              onClick={yes}
              className="min-h-11 px-3 text-sm font-semibold underline underline-offset-4"
            >
              {yesLabel}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
