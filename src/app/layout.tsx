import type { Metadata, Viewport } from "next";
import { Bungee, Geist } from "next/font/google";
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

/**
 * Bare on purpose (008 R1): the loud store lives in the (store) layout (StoreChrome) and the calm
 * back office in the admin layout, so neither carries the other's furniture.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the store's inline script sets data-awesome before React hydrates (006 R3).
    <html
      lang="en"
      className={`${geistSans.variable} ${bungee.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
