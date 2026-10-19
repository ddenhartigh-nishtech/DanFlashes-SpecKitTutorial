"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/copy";

const n = copy.console.nav;
const areas = [
  { href: "/admin", label: n.home },
  { href: "/admin/shirts", label: n.shirts },
  { href: "/admin/pricing", label: n.pricing },
  { href: "/admin/media", label: n.media },
  { href: "/admin/tiers", label: n.tiers },
  { href: "/admin/add-ons", label: n.addOns },
  { href: "/admin/settings", label: n.settings },
  { href: "/admin/customers", label: n.customers },
  { href: "/admin/orders", label: n.orders },
] as const;

/** The office's rooms. Inside the console, links are ordinary client navigations. */
export function OfficeNav() {
  const path = usePathname();
  return (
    <nav aria-label={copy.console.navLabel}>
      <ul className="flex flex-wrap gap-1">
        {areas.map((area) => {
          const here = area.href === "/admin" ? path === "/admin" : path.startsWith(area.href);
          return (
            <li key={area.href}>
              <Link
                href={area.href}
                aria-current={here ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-md px-3 text-sm ${here ? "bg-office text-office-ink font-medium" : "text-office-muted hover:text-office-ink"}`}
              >
                {area.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
