/**
 * Complexity tiers (research R15). A shirt's tier is looked up from its score: the tier with the
 * highest minScore ≤ score. The tier starting at 0 is the BLAND tier (constitution III).
 */
import type { Tier } from "@/lib/catalog/types";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function sortTiers(tiers: readonly Tier[]): Tier[] {
  return [...tiers].sort((a, b) => a.minScore - b.minScore);
}

export function tierOf(score: number, tiers: readonly Tier[]): Tier {
  const sorted = sortTiers(tiers);
  if (sorted[0]?.minScore !== 0) {
    throw new RangeError("Tiers must include one starting at min score 0 (the BLAND tier)");
  }
  let match = sorted[0];
  for (const tier of sorted) {
    if (tier.minScore <= score) match = tier;
  }
  return match;
}

export function isBlandTier(tier: Tier): boolean {
  return tier.minScore === 0;
}

/** Returns human-readable problems; an empty array means the tiers are valid. */
export function validateTiers(tiers: readonly Tier[]): string[] {
  const problems: string[] = [];
  if (tiers.length === 0) return ["At least one tier is required."];

  if (!tiers.some((t) => t.minScore === 0)) {
    problems.push("A tier must start at min score 0 (the BLAND tier).");
  }

  const seenScores = new Set<number>();
  const seenNames = new Set<string>();
  for (const t of tiers) {
    const label = t.name.trim() || `tier #${t.id}`;
    if (!t.name.trim()) problems.push(`Tier #${t.id} needs a name.`);
    if (!Number.isInteger(t.minScore) || t.minScore < 0) {
      problems.push(`${label}: min score must be a non-negative integer.`);
    }
    if (seenScores.has(t.minScore))
      problems.push(`${label}: min score ${t.minScore} is used twice.`);
    seenScores.add(t.minScore);
    const key = t.name.trim().toLowerCase();
    if (key && seenNames.has(key)) problems.push(`${label}: tier name is used twice.`);
    seenNames.add(key);
    if (!HEX_COLOR.test(t.badgeBgColor))
      problems.push(`${label}: badge background must be #RRGGBB.`);
    if (!HEX_COLOR.test(t.badgeTextColor))
      problems.push(`${label}: badge text color must be #RRGGBB.`);
  }
  return problems;
}
