import Link from "next/link";
import { Suspense } from "react";
import { currentUser } from "@/app/_data/request";
import { loadPopCandidates } from "@/app/_data/urgency";
import { CartCount } from "@/components/CartCount";
import { ExtremeAwesomeness } from "@/components/ExtremeAwesomeness";
import { PurchasePops } from "@/components/PurchasePops";
import { copy } from "@/lib/copy";

/** The logo is the way home; the cart is an icon that's always in the bar, phones included. */
const links = [
  { href: "/about", label: copy.nav.about },
  { href: "/shirts", label: copy.nav.shirts },
  { href: "/account", label: copy.nav.account },
] as const;

const linkClass =
  "flex min-h-11 items-center px-3 font-display text-sm tracking-wide text-paper uppercase hover:text-highlighter";

export function SiteHeader() {
  return (
    <header className="loud-stripes border-ink sticky top-0 z-40 border-b-4">
      <div className="bg-ink mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 md:my-3 md:rounded-sm md:shadow-[6px_6px_0_var(--color-hot-pink)]">
        <Link
          href="/"
          className="font-display text-highlighter min-h-11 content-center text-2xl md:text-3xl"
        >
          {copy.brand.name}
        </Link>

        <div className="flex items-center gap-2">
          <nav aria-label={copy.nav.mainLabel} className="hidden md:block">
            <ul className="flex gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <Suspense fallback={null}>
                <BackOfficeLink />
              </Suspense>
            </ul>
          </nav>

          {/* Extreme Awesomeness (006): beside the cart where there's room, its own row below. */}
          <ExtremeAwesomeness className="hidden lg:block" />
          <CartLink />

          {/* Phones: a no-JS disclosure menu with 44px tap targets. */}
          <details className="group relative md:hidden">
            <summary className="font-display bg-hot-pink text-paper flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-sm px-3 uppercase">
              {copy.nav.menu}
            </summary>
            <nav
              aria-label={copy.nav.mainLabel}
              // z-50: it opens over the Extreme Awesomeness row below the bar (006), never under it.
              className="border-highlighter bg-ink absolute right-0 z-50 mt-2 w-48 rounded-sm border-4 p-2"
            >
              <ul>
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
                <Suspense fallback={null}>
                  <BackOfficeLink />
                </Suspense>
              </ul>
            </nav>
          </details>
        </div>
        <ExtremeAwesomeness className="w-full lg:hidden" />
      </div>
      <Suspense fallback={null}>
        <Pops />
      </Suspense>
    </header>
  );
}

/** Fake purchase pop-ups (004 US3): mounted in the sticky header so a phone's banner rides under it. */
async function Pops() {
  const candidates = await loadPopCandidates();
  return candidates.length ? <PurchasePops candidates={candidates} /> : null;
}

function CartLink() {
  return (
    <Link
      href="/cart"
      data-testid="cart-link"
      className="text-electric-cyan hover:text-highlighter relative flex min-h-11 min-w-11 items-center justify-center transition-colors"
    >
      <CartIcon />
      <span className="sr-only">{copy.nav.cart}</span>
      <span className="absolute -top-1 -right-1">
        <Suspense fallback={null}>
          <CartCount />
        </Suspense>
      </span>
    </Link>
  );
}

function CartIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="neon size-8"
    >
      <path d="M2 3h3l2.6 12.4a1.5 1.5 0 0 0 1.5 1.1h8.8a1.5 1.5 0 0 0 1.5-1.2L21 7H6" />
      <circle cx="9.5" cy="20.5" r="1.5" />
      <circle cx="17.5" cy="20.5" r="1.5" />
    </svg>
  );
}

/**
 * The way into the owner's console (008 FR-004): admins only, and a plain <a> so crossing into the
 * calm back office is a full page load that leaves the strobe and pipes behind (R1).
 */
async function BackOfficeLink() {
  const user = await currentUser();
  if (!user?.isAdmin) return null;
  return (
    <li>
      <a href="/admin" data-testid="back-office-link" className={linkClass}>
        {copy.nav.backOffice}
      </a>
    </li>
  );
}
