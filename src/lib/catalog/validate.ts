/**
 * Catalog validation: shape rules (Zod) plus the business rules the database can't express,
 * chiefly constitution III — a BLAND-tier shirt must cost less than the MSRP start price.
 */
import { z } from "zod";
import { isBlandTier, sortTiers, tierOf } from "@/lib/catalog/tiers";
import {
  SHIRT_STATUSES,
  SHIRT_STYLES,
  type MsrpSettings,
  type ShirtStatus,
  type ShirtStyle,
  type StoreSettings,
  type Tier,
} from "@/lib/catalog/types";
import { cmp, formatUsd, isUsdString } from "@/lib/money";
import { resolvePrice } from "@/lib/pricing/resolve";

export interface Issue {
  field: string;
  message: string;
}

export interface ShirtDraft {
  slug: string;
  name: string;
  style: string;
  complexity: number;
  finalPriceUsd: string | null;
  description: string;
  status: string;
  featured: boolean;
}

const MIN_PRICE = "0.01";

const positiveUsd = z
  .string()
  .refine(isUsdString, "Must be dollars and cents, e.g. 299.99")
  .refine((v) => !isUsdString(v) || cmp(v, MIN_PRICE) >= 0, "Must be at least $0.01");

const shirtSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, and hyphens only"),
  name: z.string().trim().min(1, "Required").max(80, "80 characters max"),
  style: z.enum(SHIRT_STYLES as [ShirtStyle, ...ShirtStyle[]]),
  complexity: z.number().int("Whole numbers only").min(0, "Can't be negative"),
  finalPriceUsd: positiveUsd.nullable(),
  description: z.string().trim().min(1, "Required"),
  status: z.enum(SHIRT_STATUSES as [ShirtStatus, ...ShirtStatus[]]),
  featured: z.boolean(),
});

const settingsSchema = z.object({
  msrp: z.object({
    startPriceUsd: positiveUsd,
    anchorScore: z.number().int().min(0),
    doublingInterval: z.number().int().min(1),
  }),
  checkoutGate: z.boolean(),
  flashCreditPresetsUsd: z.array(positiveUsd),
  mediaBaseUrl: z.union([
    z.literal(""),
    z.string().regex(/^https?:\/\/\S+$/, "Must be http(s)://"),
  ]),
  placeholderMediaId: z.number().int().nullable(),
  blandShaming: z.boolean(),
  confirmshaming: z.boolean(),
});

function toIssues(error: z.ZodError): Issue[] {
  return error.issues.map((issue) => ({
    field: issue.path.filter((p) => typeof p === "string").join("."),
    message: issue.message,
  }));
}

export function validateShirt(
  draft: ShirtDraft,
  ctx: { tiers: readonly Tier[]; msrp: MsrpSettings; imageCount: number },
): Issue[] {
  const parsed = shirtSchema.safeParse(draft);
  if (!parsed.success) return toIssues(parsed.error);

  const issues: Issue[] = [];
  const shirt = parsed.data;

  if (isBlandTier(tierOf(shirt.complexity, ctx.tiers))) {
    const { finalPriceUsd } = resolvePrice(shirt, ctx.msrp);
    if (cmp(finalPriceUsd, ctx.msrp.startPriceUsd) >= 0) {
      issues.push({
        field: "finalPriceUsd",
        message: `BLAND shirts must cost less than ${formatUsd(ctx.msrp.startPriceUsd)}; this one resolves to ${formatUsd(finalPriceUsd)}.`,
      });
    }
  }

  if (shirt.status === "active" && ctx.imageCount < 1) {
    issues.push({ field: "images", message: "An active shirt needs at least one image." });
  }
  return issues;
}

export function validateSettings(settings: StoreSettings): Issue[] {
  const parsed = settingsSchema.safeParse(settings);
  return parsed.success ? [] : toIssues(parsed.error);
}

export interface SeedCheckShirt {
  slug: string;
  style: ShirtStyle;
  complexity: number;
  status: ShirtStatus;
}

/** FR-006 seed-catalog checks. Warnings only: a real catalog may legitimately differ. */
export function seedChecks(shirts: readonly SeedCheckShirt[], tiers: readonly Tier[]): string[] {
  const active = shirts.filter((s) => s.status === "active");
  const warnings: string[] = [];

  if (active.length < 12) {
    warnings.push(`Only ${active.length} active shirts; the seed catalog should have at least 12.`);
  }
  for (const style of SHIRT_STYLES) {
    if (!active.some((s) => s.style === style)) warnings.push(`No active ${style} shirts.`);
  }

  const counts = new Map<number, number>();
  for (const s of active) {
    const t = tierOf(s.complexity, tiers);
    counts.set(t.id, (counts.get(t.id) ?? 0) + 1);
  }
  const bland = sortTiers(tiers)[0];
  const blandCount = counts.get(bland.id) ?? 0;
  if (blandCount < 2) {
    warnings.push(`Only ${blandCount} BLAND shirts; the seed catalog should have at least 2.`);
  }
  for (const t of sortTiers(tiers)) {
    if (!isBlandTier(t) && !counts.get(t.id))
      warnings.push(`Tier "${t.name}" has no active shirts.`);
  }

  if (!active.some((s) => s.slug.includes("tc-tugger"))) {
    warnings.push('No T.C. Tugger cross-over shirt (a slug containing "tc-tugger").');
  }
  return warnings;
}
