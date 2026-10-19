/**
 * Editing the tiers as one set (008 FR-028, FR-029, R9): the rules a proposed set must keep (BLAND
 * stays at 0 with its name; names, taglines, colors, no shared starts), and which shirts would
 * change tier. Pure: the console's editor runs it as Dan types, and the save runs it again.
 */
import { tierOf, validateTiers } from "@/lib/catalog/tiers";
import type { Tier } from "@/lib/catalog/types";
import type { Issue } from "@/lib/catalog/validate";
import { copy } from "@/lib/copy";

/** A tier as the editor sends it: an existing tier has its id; a new one has none. */
export interface TierDraft {
  id?: number;
  name: string;
  tagline: string | null;
  minScore: number;
  badgeBgColor: string;
  badgeTextColor: string;
}

const t = copy.console.tiers;

/** Drafts as tiers (a new one gets a stand-in id), ready for tierOf and validateTiers. */
export function asTiers(drafts: readonly TierDraft[]): Tier[] {
  return drafts.map((d, i) => ({
    id: d.id ?? -(i + 1),
    name: d.name.trim(),
    tagline: d.tagline,
    minScore: d.minScore,
    badgeBgColor: d.badgeBgColor,
    badgeTextColor: d.badgeTextColor,
  }));
}

export function validateTierEdit(
  current: readonly Tier[],
  proposed: readonly TierDraft[],
): Issue[] {
  const issues: Issue[] = [];
  const known = new Set(current.map((tier) => tier.id));
  if (proposed.some((d) => d.id !== undefined && !known.has(d.id))) {
    issues.push({ field: "tiers", message: t.unknown });
  }
  const bland = current.find((tier) => tier.minScore === 0);
  const blandDraft = bland && proposed.find((d) => d.id === bland.id);
  if (
    bland &&
    (!blandDraft || blandDraft.name.trim() !== bland.name || blandDraft.minScore !== 0)
  ) {
    issues.push({ field: "tiers", message: t.blandLocked });
  }
  if (proposed.some((d) => d.name.trim().length < 1 || d.name.trim().length > 40)) {
    issues.push({ field: "tiers", message: t.nameLength });
  }
  if (proposed.some((d) => (d.tagline?.trim().length ?? 0) > 120)) {
    issues.push({ field: "tiers", message: t.taglineLength });
  }
  for (const message of validateTiers(asTiers(proposed))) {
    issues.push({ field: "tiers", message });
  }
  return issues;
}

/** Each shirt whose tier would change under the proposed set, from and to (by name). */
export function tierChanges<S extends { complexity: number }>(
  shirts: readonly S[],
  current: readonly Tier[],
  proposed: readonly TierDraft[],
): { shirt: S; from: string; to: string }[] {
  const next = asTiers(proposed);
  if (!next.some((tier) => tier.minScore === 0) || !current.some((tier) => tier.minScore === 0)) {
    return [];
  }
  return shirts.flatMap((shirt) => {
    const from = tierOf(shirt.complexity, current).name;
    const to = tierOf(shirt.complexity, next).name;
    return from === to ? [] : [{ shirt, from, to }];
  });
}
