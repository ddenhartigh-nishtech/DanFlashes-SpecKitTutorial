import Link from "next/link";
import { Suspense } from "react";
import { CartCount } from "@/components/CartCount";
import { copy } from "@/lib/copy";

const links = [
  { href: "/", label: copy.nav.home },
  { href: "/shirts", label: copy.nav.shirts },
  { href: "/cart", label: copy.nav.cart },
  { href: "/account", label: copy.nav.account },
  { href: "/about", label: copy.nav.about },
] as const;

const linkClass =
  "flex min-h-11 items-center px-3 font-display text-sm tracking-wide text-paper uppercase hover:text-highlighter";

export function SiteHeader() {
  return (
    <header className="loud-stripes border-ink sticky top-0 z-40 border-b-4">
      <div className="bg-ink mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 md:my-3 md:rounded-sm md:shadow-[6px_6px_0_var(--color-hot-pink)]">
        <Link
          href="/"
          className="font-display text-highlighter min-h-11 content-center text-2xl md:text-3xl"
        >
          {copy.brand.name}
        </Link>

        <nav aria-label={copy.nav.mainLabel} className="hidden md:block">
          <ul className="flex gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                  {link.href === "/cart" ? (
                    <Suspense fallback={null}>
                      <CartCount />
                    </Suspense>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Phones: a no-JS disclosure menu with 44px tap targets. */}
        <details className="group relative md:hidden">
          <summary className="font-display bg-hot-pink text-paper flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-sm px-3 uppercase">
            {copy.nav.menu}
          </summary>
          <nav
            aria-label={copy.nav.mainLabel}
            className="border-highlighter bg-ink absolute right-0 mt-2 w-48 rounded-sm border-4 p-2"
          >
            <ul>
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                    {link.href === "/cart" ? (
                      <Suspense fallback={null}>
                        <CartCount />
                      </Suspense>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}
