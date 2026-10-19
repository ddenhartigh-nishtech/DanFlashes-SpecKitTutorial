import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/app/_data/admin";
import { ConsoleLoading, ConsolePage } from "@/components/admin/ConsolePage";
import { ui } from "@/components/admin/ui";
import { auditCatalog } from "@/lib/catalog/audit";
import { copy } from "@/lib/copy";
import { getDb } from "@/lib/db/client";

const c = copy.console;
const areas = [
  { href: "/admin/shirts", label: c.nav.shirts, line: "Scores, prices, and what's on the floor." },
  { href: "/admin/pricing", label: c.nav.pricing, line: "How the prices line up with the shapes." },
  { href: "/admin/media", label: c.nav.media, line: "The pictures, and where they hang." },
  { href: "/admin/tiers", label: c.nav.tiers, line: "The bands, from BLAND upward." },
  { href: "/admin/add-ons", label: c.nav.addOns, line: "The extras at checkout." },
  { href: "/admin/settings", label: c.nav.settings, line: "Every switch, and the MSRP dials." },
  { href: "/admin/customers", label: c.nav.customers, line: "Who's buying, and their credit." },
  { href: "/admin/orders", label: c.nav.orders, line: "Everything that's been bought." },
] as const;

export default function OfficeHome() {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  await requireAdmin();
  const { errors, warnings } = auditCatalog(getDb());
  return (
    <ConsolePage title={c.welcome.title} intro={c.welcome.body}>
      <p data-testid="problem-count" className={ui.card}>
        {c.welcome.problems(errors.length + warnings.length)}{" "}
        {errors.length + warnings.length ? (
          <Link href="/admin/pricing" className={ui.link}>
            {c.nav.pricing}
          </Link>
        ) : null}
      </p>
      <section className="flex flex-col gap-3">
        <h2 className={ui.h2}>{c.welcome.areas}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map((area) => (
            <li key={area.href}>
              <Link href={area.href} className={`${ui.card} hover:border-office-sage block h-full`}>
                <span className="font-medium">{area.label}</span>
                <span className={`${ui.muted} mt-1 block`}>{area.line}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </ConsolePage>
  );
}
