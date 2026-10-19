import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { currentAdmin } from "@/app/_data/admin";
import { OfficeNav } from "@/components/admin/OfficeNav";
import { copy } from "@/lib/copy";

/**
 * Dan's Office (008): the calm back office. Nothing of it is in the static shell (the fallback is
 * empty), so anyone who isn't an admin gets the store's ordinary 404 and never a scrap of console
 * markup (R2). Each page checks again before it reads anything (`requireAdmin`).
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={null}>
      <Office>{children}</Office>
    </Suspense>
  );
}

async function Office({ children }: { children: ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) notFound();
  return (
    <div className="office flex min-h-screen flex-1 flex-col">
      <header className="border-office-line bg-office-card border-b">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-semibold tracking-tight">{copy.console.brand}</p>
            {/* A full load on purpose: the store's strobe and pipes stay out of here (008 R1). */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="text-office-muted hover:text-office-ink text-sm underline">
              {copy.console.backToStore}
            </a>
          </div>
          <OfficeNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-8">{children}</main>
    </div>
  );
}
