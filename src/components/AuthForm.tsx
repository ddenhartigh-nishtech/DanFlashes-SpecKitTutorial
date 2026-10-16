"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { signInAction, signUpAction } from "@/actions/auth";
import { anyNosyBlank, clearNosy, NosyFields } from "@/components/NosyFields";
import type { ActionState } from "@/lib/actions/state";
import { copy } from "@/lib/copy";
import { shouldNudge } from "@/lib/nosy/nudge";

const input = "border-ink bg-paper mt-1 block min-h-11 w-full border-4 px-3 font-semibold";
const FORM_ID = "sign-up-form";

export function AuthForm({
  mode,
  next,
  nosy = false,
}: {
  mode: "sign-in" | "sign-up";
  next: string;
  /** The nosy sign-up (009): far too many questions after the real fields. Sign-up only. */
  nosy?: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(
    mode === "sign-in" ? signInAction : signUpAction,
    null,
  );
  const otherHref = `/${mode === "sign-in" ? "sign-up" : "sign-in"}?next=${encodeURIComponent(next)}`;
  const nosyRef = useRef<HTMLDivElement>(null);
  const nudged = useRef(false);
  const [skipped, setSkipped] = useState(false);
  const really = nosy ? " **" : "";

  // What he typed is gone once he leaves: on unmount, when Next hides the page he left (effect
  // cleanup), and on pagehide (the back-forward cache). Dan's line resets with it: once per visit.
  useEffect(() => {
    if (!nosy) return;
    const root = nosyRef.current;
    const leave = () => {
      clearNosy(root);
      nudged.current = false;
      setSkipped(false);
    };
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [nosy]);

  // The first press with a blank nosy field gets Dan's line instead of an account (FR-008). The
  // browser's own checks on the real fields run before this, as always.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (
      !nosy ||
      !shouldNudge({ anyBlank: anyNosyBlank(nosyRef.current), nudged: nudged.current })
    ) {
      return;
    }
    event.preventDefault(); // React skips a form action whose submit was prevented
    nudged.current = true;
    setSkipped(true);
  };

  const status = (
    <div role="status" aria-live="polite">
      {state && !state.ok ? (
        <p className="bg-safety-orange border-ink border-4 px-3 py-2 font-bold">{state.message}</p>
      ) : null}
    </div>
  );
  const button = (
    <button
      type="submit"
      form={nosy ? FORM_ID : undefined}
      disabled={pending}
      className="font-display bg-hot-pink text-paper min-h-12 px-6 text-lg uppercase shadow-[4px_4px_0_var(--color-ink)] disabled:opacity-60"
    >
      {pending ? copy.auth.working : mode === "sign-in" ? copy.auth.signIn : copy.auth.signUp}
    </button>
  );
  const other = (
    <Link href={otherHref} className="font-semibold underline decoration-2 underline-offset-4">
      {mode === "sign-in" ? copy.auth.toSignUp : copy.auth.toSignIn}
    </Link>
  );

  const form = (
    <form
      id={nosy ? FORM_ID : undefined}
      action={action}
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="next" value={next} />
      {mode === "sign-up" ? (
        <label className="font-display text-sm uppercase">
          {copy.auth.displayName}
          <input name="displayName" autoComplete="nickname" className={input} />
        </label>
      ) : null}
      <label className="font-display text-sm uppercase">
        {copy.auth.email}
        {really}
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="font-display text-sm uppercase">
        {copy.auth.password}
        {really}
        <input
          name="password"
          type="password"
          required
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          className={input}
        />
        {mode === "sign-up" ? (
          <span className="mt-1 block font-sans text-xs normal-case">{copy.auth.passwordHint}</span>
        ) : null}
      </label>
      {nosy ? null : (
        <>
          {status}
          {button}
          {other}
        </>
      )}
    </form>
  );

  if (!nosy) return form;

  // The nosy sign-up: the real form, then every nosy question outside it, then Sign up last. The
  // button joins the form by id, so the questions are never part of what it sends (research R2).
  return (
    <div className="flex flex-col gap-4">
      {form}
      <NosyFields ref={nosyRef} />
      {skipped ? (
        <p
          data-testid="nosy-skipped"
          className="bg-highlighter border-ink border-4 px-3 py-2 font-bold"
        >
          {copy.nosy.skipped}
        </p>
      ) : null}
      {status}
      <p className="text-sm font-semibold">{copy.nosy.legend}</p>
      {button}
      {other}
    </div>
  );
}
