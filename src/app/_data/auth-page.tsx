import "server-only";
import { redirect } from "next/navigation";
import { currentUser } from "@/app/_data/request";
import { AuthForm } from "@/components/AuthForm";
import { safeNext } from "@/lib/auth/safe-next";
import { copy } from "@/lib/copy";
import { getSettings } from "@/lib/data/settings";
import { getDb } from "@/lib/db/client";

/** Shared body of /sign-in and /sign-up. Request-time: render inside <Suspense>. */
export async function AuthPageBody({
  mode,
  searchParams,
}: {
  mode: "sign-in" | "sign-up";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).next;
  const next = safeNext(typeof raw === "string" ? raw : null);
  if (await currentUser()) redirect(next);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_24rem] md:items-start">
      <div className="loud-stripes border-ink border-4 p-4">
        <div className="solid-backing p-6">
          <h1 className="font-display text-highlighter text-3xl md:text-5xl">
            {mode === "sign-in" ? copy.auth.signInHeading : copy.auth.signUpHeading}
          </h1>
          {next === "/checkout" ? (
            <p data-testid="gate-copy" className="bg-highlighter text-ink mt-4 p-3 font-bold">
              {copy.auth.gate}
            </p>
          ) : null}
        </div>
      </div>
      <div className="border-ink bg-paper border-4 p-4 shadow-[6px_6px_0_var(--color-ink)]">
        <AuthForm
          mode={mode}
          next={next}
          nosy={mode === "sign-up" && getSettings(getDb()).nosySignUp}
        />
      </div>
    </div>
  );
}
