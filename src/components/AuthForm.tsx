"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, signUpAction } from "@/actions/auth";
import type { ActionState } from "@/lib/actions/state";
import { copy } from "@/lib/copy";

const input = "border-ink bg-paper mt-1 block min-h-11 w-full border-4 px-3 font-semibold";

export function AuthForm({ mode, next }: { mode: "sign-in" | "sign-up"; next: string }) {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(
    mode === "sign-in" ? signInAction : signUpAction,
    null,
  );
  const otherHref = `/${mode === "sign-in" ? "sign-up" : "sign-in"}?next=${encodeURIComponent(next)}`;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {mode === "sign-up" ? (
        <label className="font-display text-sm uppercase">
          {copy.auth.displayName}
          <input name="displayName" autoComplete="nickname" className={input} />
        </label>
      ) : null}
      <label className="font-display text-sm uppercase">
        {copy.auth.email}
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="font-display text-sm uppercase">
        {copy.auth.password}
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

      <div role="status" aria-live="polite">
        {state && !state.ok ? (
          <p className="bg-safety-orange border-ink border-4 px-3 py-2 font-bold">
            {state.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="font-display bg-hot-pink text-paper min-h-12 px-6 text-lg uppercase shadow-[4px_4px_0_var(--color-ink)] disabled:opacity-60"
      >
        {pending ? copy.auth.working : mode === "sign-in" ? copy.auth.signIn : copy.auth.signUp}
      </button>
      <Link href={otherHref} className="font-semibold underline decoration-2 underline-offset-4">
        {mode === "sign-in" ? copy.auth.toSignUp : copy.auth.toSignIn}
      </Link>
    </form>
  );
}
