import { tierOf } from "@/lib/catalog/tiers";
import type { MsrpSettings, Tier } from "@/lib/catalog/types";
import { copy } from "@/lib/copy";
import { formatUsd, tryParseUsd } from "@/lib/money";
import { resolvePrice } from "@/lib/pricing/resolve";

const p = copy.console.shirts.preview;

/**
 * What the store will show for a score and a price, as Dan types (008 FR-008). It runs the same
 * `tierOf` and `resolvePrice` the store does: one MSRP algorithm, never a copy.
 */
export function PricePreview({
  score,
  price,
  tiers,
  msrp,
}: {
  score: string;
  price: string;
  tiers: Tier[];
  msrp: MsrpSettings;
}) {
  const complexity = /^\d+$/.test(score.trim()) ? Number(score.trim()) : null;
  const owner = price.trim() === "" ? null : tryParseUsd(price);
  let tier: string | null = null;
  let msrpUsd: string | null = null;
  let finalUsd: string | null = null;
  let tooComplicated = false;
  if (complexity !== null) {
    tier = tierOf(complexity, tiers).name;
    try {
      const resolved = resolvePrice({ complexity, finalPriceUsd: owner }, msrp);
      msrpUsd = formatUsd(resolved.msrpUsd);
      finalUsd = formatUsd(resolved.finalPriceUsd);
    } catch {
      tooComplicated = true;
    }
  }
  return (
    <dl
      data-testid="price-preview"
      aria-label={p.label}
      className="border-office-line bg-office grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-md border p-3 text-sm [overflow-wrap:anywhere]"
    >
      <dt className="text-office-muted">{p.tier}</dt>
      <dd>{tier ?? "—"}</dd>
      <dt className="text-office-muted">{p.msrp}</dt>
      <dd>{tooComplicated ? p.cantPrice : (msrpUsd ?? "—")}</dd>
      <dt className="text-office-muted">{p.final}</dt>
      <dd>
        {finalUsd ?? "—"}
        {finalUsd ? (
          <span className="text-office-muted"> ({owner ? p.dans : p.isMsrp})</span>
        ) : null}
      </dd>
    </dl>
  );
}
