import Link from "next/link";
import { ui } from "@/components/admin/ui";
import { copy } from "@/lib/copy";
import type { AdminShirtRow } from "@/lib/data/admin-shirts";
import { formatUsd } from "@/lib/money";

const t = copy.console.shirts.table;
const cols = "md:grid md:grid-cols-[3.5rem_2fr_4rem_1.6fr_1fr_1.3fr_1fr] md:items-center md:gap-3";

/** Every shirt, one row each; on a phone each row stacks into a small card (008 FR-006, FR-037). */
export function ShirtTable({ shirts }: { shirts: AdminShirtRow[] }) {
  return (
    <div className={ui.card}>
      <div className={`${cols} text-office-muted hidden border-b pb-2 text-xs font-medium`}>
        <span />
        <span>{t.name}</span>
        <span>{t.score}</span>
        <span>{t.tier}</span>
        <span>{t.msrp}</span>
        <span>{t.final}</span>
        <span>{t.status}</span>
      </div>
      <ul className="divide-office-line divide-y">
        {shirts.map((shirt) => (
          <li
            key={shirt.id}
            data-testid="admin-shirt"
            data-slug={shirt.slug}
            className={`${cols} flex flex-col gap-1 py-3 text-sm`}
          >
            {shirt.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- shirt art is SVG or uploads
              <img src={shirt.image.url} alt="" width={48} height={48} className="size-12" />
            ) : (
              <span className="bg-office size-12 rounded" />
            )}
            <span className="flex flex-col">
              <Link href={`/admin/shirts/${shirt.id}`} className={`${ui.link} font-medium`}>
                {shirt.name}
              </Link>
              <span className={ui.muted}>
                {copy.styles[shirt.style]}
                {shirt.featured ? ` · ${copy.console.shirts.featured}` : ""}
                {shirt.origin !== "catalog"
                  ? ` · ${copy.console.generator.origins[shirt.origin]}`
                  : ""}
              </span>
            </span>
            <span>
              <span className="text-office-muted md:hidden">{t.score}: </span>
              <span data-testid="score">{shirt.complexity}</span>
            </span>
            <span>
              <span
                data-testid="tier-name"
                className="inline-block rounded px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: shirt.tier.badgeBgColor,
                  color: shirt.tier.badgeTextColor,
                }}
              >
                {shirt.tier.name}
              </span>
            </span>
            <span>
              <span className="text-office-muted md:hidden">{t.msrp}: </span>
              {formatUsd(shirt.msrpUsd)}
            </span>
            <span>
              <span className="text-office-muted md:hidden">{t.final}: </span>
              {formatUsd(shirt.finalPriceUsd)}
              <span className="text-office-muted text-xs">
                {" "}
                (
                {shirt.priceIsDans
                  ? copy.console.shirts.preview.dans
                  : copy.console.shirts.preview.isMsrp}
                )
              </span>
            </span>
            <span className={shirt.status === "active" ? "" : "text-office-muted"}>
              {shirt.status === "active"
                ? copy.console.shirts.status.active
                : copy.console.shirts.filters.inactive}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
