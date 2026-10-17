import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageBody } from "@/app/_data/auth-page";
import { copy } from "@/lib/copy";

export const metadata: Metadata = { title: copy.auth.signUpTitle };

export default function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  return (
    <Suspense
      fallback={<div className="loud-dots border-ink h-64 animate-pulse border-4 opacity-60" />}
    >
      <AuthPageBody mode="sign-up" searchParams={searchParams} />
    </Suspense>
  );
}
