import type { Metadata, Viewport } from "next";
import { Bungee, Geist } from "next/font/google";
import { Suspense } from "react";
import { AwesomeIsland } from "@/app/_data/awesome";
import { DrainCorner } from "@/components/DrainCorner";
import { InlineScript } from "@/components/InlineScript";
import { SiteHeader } from "@/components/SiteHeader";
import { firstPaintScript } from "@/lib/awesome/choice";
import { strobeCss } from "@/lib/awesome/strobe";
import { copy } from "@/lib/copy";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const bungee = Bungee({
  variable: "--font-bungee",
  weight: "400",
  subsets: ["latin"],
  // Never swap after first paint: a late display-font swap rewrapped headings and shifted
  // the listing (CLS 0.16 under throttling). Preloaded, so normal loads still get Bungee.
  display: "optional",
});

export const metadata: Metadata = {
  title: {
    default: `${copy.brand.name} — ${copy.brand.tagline}`,
    template: `%s · ${copy.brand.name}`,
  },
  description: copy.brand.tagline,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the inline script sets data-awesome before React hydrates (006 R3).
    <html
      lang="en"
      className={`${geistSans.variable} ${bungee.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={firstPaintScript()} />
        {/* The strobe's colors, one rule per step (006 R7). Static: the layout stays prerenderable. */}
        <style dangerouslySetInnerHTML={{ __html: strobeCss() }} />
      </head>
      <body className="flex min-h-full flex-col">
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
      </body>
    </html>
  );
}
