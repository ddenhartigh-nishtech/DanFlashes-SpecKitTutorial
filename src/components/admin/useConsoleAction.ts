"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import type { ConsoleState } from "@/lib/admin/state";

type Action = (prev: ConsoleState | null, form: FormData) => Promise<ConsoleState>;

/**
 * A console form's action, submitted by hand: React 19's `<form action>` resets the form after
 * every action, even a refusal, which would wipe what Dan typed (005 lesson). Hand-submitting
 * keeps it.
 */
export function useConsoleAction(action: Action, initial: ConsoleState | null = null) {
  const [state, dispatch, pending] = useActionState(action, initial);
  const [, startTransition] = useTransition();
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(form));
  };
  return { state, onSubmit, pending };
}
