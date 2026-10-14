import { findSessionUser, type SessionUser } from "@/lib/auth/session";
import { copy, type ErrorCode } from "@/lib/copy";
import type { Db } from "@/lib/db/client";
import { SESSION_COOKIE, type CookieJar } from "@/lib/http/cookies";

/** What a form's action hands back to the UI (useActionState). Messages are brand voice. */
export type ActionState =
  | { ok: true; message?: string; itemCount?: number; balanceUsd?: string; redirectTo?: string }
  | {
      ok: false;
      code: ErrorCode;
      message: string;
      totalUsd?: string;
      balanceUsd?: string;
      creditUsd?: string;
      cardUsd?: string;
    };

type FailureExtra = {
  message?: string;
  totalUsd?: string;
  balanceUsd?: string;
  creditUsd?: string;
  cardUsd?: string;
};

export function failure(code: ErrorCode, extra: FailureExtra = {}): ActionState {
  return { ok: false, code, message: copy.codes[code], ...extra };
}

export function sessionUser(db: Db, jar: CookieJar): SessionUser | null {
  return findSessionUser(db, jar.get(SESSION_COOKIE));
}

export const field = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};
