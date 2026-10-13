import type { TierBadge } from "@/lib/data/shirts";

/** The shopper-facing complexity signal: the tier's name in the tier's colors. Never a score. */
export function ShirtBadge({
  tier,
  showTagline = false,
}: {
  tier: TierBadge;
  showTagline?: boolean;
}) {
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span
        data-testid="tier-badge"
        className="font-display border-ink inline-block border-2 px-2 py-0.5 text-xs tracking-wide uppercase shadow-[3px_3px_0_var(--color-ink)]"
        style={{ backgroundColor: tier.badgeBgColor, color: tier.badgeTextColor }}
      >
        {tier.name}
      </span>
      {showTagline && tier.tagline ? (
        <span className="bg-paper px-1 text-sm font-semibold italic">{tier.tagline}</span>
      ) : null}
    </span>
  );
}
