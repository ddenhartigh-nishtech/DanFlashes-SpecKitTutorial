import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/app/_data/admin";
import { ConsoleLoading, ConsolePage } from "@/components/admin/ConsolePage";
import { CHART_BOX, PriceChart } from "@/components/admin/PriceChart";
import { ui } from "@/components/admin/ui";
import {
  chartPoints,
  findInversions,
  overrideDistances,
  type PricedShirt,
} from "@/lib/admin/pricing";
import { auditIssues, type AuditIssue } from "@/lib/catalog/audit";
import { copy } from "@/lib/copy";
import { listAdminShirts } from "@/lib/data/admin-shirts";
import { getSettings } from "@/lib/data/settings";
import { listTiers } from "@/lib/data/tiers";
import { getDb } from "@/lib/db/client";
import { formatUsd } from "@/lib/money";

const p = copy.console.pricing;

export default function PricingPage() {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <Pricing />
    </Suspense>
  );
}

function ShirtLink({ shirt }: { shirt: PricedShirt }) {
  return (
    <Link href={`/admin/shirts/${shirt.id}`} className={ui.link}>
      {shirt.name}
    </Link>
  );
}

async function Pricing() {
  await requireAdmin();
  const db = getDb();
  const all = listAdminShirts(db, {});
  const active: PricedShirt[] = all.filter((s) => s.status === "active");
  const ids = new Map(all.map((s) => [s.slug, s.id]));
  const issues = auditIssues(db);
  const fixLink = (issue: AuditIssue) =>
    issue.kind === "shirt" && issue.ref && ids.has(issue.ref)
      ? `/admin/shirts/${ids.get(issue.ref)}`
      : issue.kind === "tier"
        ? "/admin/tiers"
        : issue.kind === "settings"
          ? "/admin/settings"
          : issue.kind === "media"
            ? "/admin/media"
            : "/admin/shirts";

  const inversions = findInversions(active);
  const overrides = overrideDistances(active);
  const enough = active.length >= 2;

  return (
    <ConsolePage title={p.title} intro={p.intro}>
      <section className={`${ui.card} flex flex-col gap-3`}>
        <h2 className={ui.h2}>{p.chartTitle}</h2>
        <p className={ui.muted}>{p.chartHelp}</p>
        {enough ? (
          <PriceChart chart={chartPoints(active, listTiers(db), getSettings(db).msrp, CHART_BOX)} />
        ) : (
          <p>{p.nothing}</p>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <section className={`${ui.card} flex flex-col gap-3`}>
          <h2 className={ui.h2}>{p.inversionsTitle}</h2>
          <p className={ui.muted}>{p.inversionsHelp}</p>
          {!enough ? (
            <p>{p.nothing}</p>
          ) : inversions.length === 0 ? (
            <p>{p.noInversions}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {inversions.map(({ simpler, complex, gapUsd }) => (
                <li
                  key={`${simpler.id}-${complex.id}`}
                  data-testid="inversion"
                  className="border-office-line rounded-md border p-3 text-sm"
                >
                  <p>{p.costsMore(simpler.name, complex.name, formatUsd(gapUsd))}</p>
                  <p className={`${ui.muted} mt-1 flex flex-wrap gap-x-4`}>
                    <span>
                      <ShirtLink shirt={simpler} />:{" "}
                      {p.scoreAndPrice(simpler.complexity, formatUsd(simpler.finalPriceUsd))}
                    </span>
                    <span>
                      <ShirtLink shirt={complex} />:{" "}
                      {p.scoreAndPrice(complex.complexity, formatUsd(complex.finalPriceUsd))}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${ui.card} flex flex-col gap-3`}>
          <h2 className={ui.h2}>{p.overridesTitle}</h2>
          <p className={ui.muted}>{p.overridesHelp}</p>
          {overrides.length === 0 ? (
            <p>{p.noOverrides}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {overrides.map(({ shirt, diffUsd, percent, direction }) => (
                <li
                  key={shirt.id}
                  data-testid="override"
                  className="border-office-line rounded-md border p-3 text-sm"
                >
                  <ShirtLink shirt={shirt} />{" "}
                  <span className={ui.muted}>
                    {formatUsd(shirt.finalPriceUsd)} ·{" "}
                    {p.distance(
                      formatUsd(diffUsd.replace(/^-/, "")),
                      percent.replace(/^-/, ""),
                      p[direction],
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section data-testid="audit" className={`${ui.card} flex flex-col gap-3`}>
        <h2 className={ui.h2}>{p.auditTitle}</h2>
        <p className={ui.muted}>{p.auditHelp}</p>
        {issues.length === 0 ? (
          <p>{p.auditClean}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {issues.map((issue, i) => (
              <li key={i} className="border-office-line rounded-md border p-3 text-sm">
                <span className="font-medium">
                  {issue.level === "error" ? p.error : p.warning}:
                </span>{" "}
                <span className="break-words">{issue.text}</span>{" "}
                <Link href={fixLink(issue)} className={ui.link}>
                  {p.fix}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ConsolePage>
  );
}
