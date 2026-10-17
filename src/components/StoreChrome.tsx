import { Suspense, type ReactNode } from "react";
import { AwesomeIsland } from "@/app/_data/awesome";
import { DrainCorner } from "@/components/DrainCorner";
import { InlineScript } from "@/components/InlineScript";
import { SiteHeader } from "@/components/SiteHeader";
import { firstPaintScript } from "@/lib/awesome/choice";
import { strobeCss } from "@/lib/awesome/strobe";
import { copy } from "@/lib/copy";

/**
 * The loud store around every shopper page (008 R1): Extreme Awesomeness's first-paint script and
 * strobe colors, the header with its pop-ups, the drain corner, the awesome island and the footer.
 * The (store) layout and the store's 404 render it; the owner's console never does, so nothing in
 * here can reach the calm back office.
 */
export function StoreChrome({ children }: { children: ReactNode }) {
  return (
    <>
      {/* First in <body>: it sets data-awesome before any store content paints (006 R3, 008 R16). */}
      <InlineScript html={firstPaintScript()} />
      {/* The strobe's colors, one rule per step (006 R7). Static: the shell stays prerenderable. */}
      <style dangerouslySetInnerHTML={{ __html: strobeCss() }} />
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-10">{children}</main>
      <Suspense fallback={null}>
        <DrainCorner />
      </Suspense>
      <Suspense fallback={null}>
        <AwesomeIsland />
      </Suspense>
      <footer className="loud-dots border-ink border-t-4">
        <p className="mx-auto max-w-6xl px-4 py-3">
          <span className="font-display solid-backing inline-block px-3 py-1 text-sm">
            {copy.footer}
          </span>
        </p>
      </footer>
    </>
  );
}
