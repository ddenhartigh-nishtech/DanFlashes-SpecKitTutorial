/**
 * The pricing analysis (008 US3, R12): pure and exact. Which shirts are priced against the
 * complexity order, how far each of Dan's prices sits from its MSRP, and where everything lands on
 * a price-against-score chart. Chart positions are pixels, not money: every amount shown stays the
 * exact string.
 */
import { sortTiers } from "@/lib/catalog/tiers";
import type { MsrpSettings, Tier } from "@/lib/catalog/types";
import { cmp, percentDiff, sub, type Usd } from "@/lib/money";
import { msrpUsd } from "@/lib/pricing/msrp";

export interface PricedShirt {
  id: number;
  slug: string;
  name: string;
  complexity: number;
  msrpUsd: Usd;
  finalPriceUsd: Usd;
  priceIsDans: boolean;
}

/** A simpler shirt that costs more than a more complicated one. */
export interface Inversion {
  simpler: PricedShirt;
  complex: PricedShirt;
  gapUsd: Usd;
}

/** FR-019: every such pair, biggest gap first. Equal scores are never flagged. */
export function findInversions(shirts: readonly PricedShirt[]): Inversion[] {
  const pairs: Inversion[] = [];
  for (const simpler of shirts) {
    for (const complex of shirts) {
      if (
        simpler.complexity < complex.complexity &&
        cmp(simpler.finalPriceUsd, complex.finalPriceUsd) > 0
      ) {
        pairs.push({ simpler, complex, gapUsd: sub(simpler.finalPriceUsd, complex.finalPriceUsd) });
      }
    }
  }
  return pairs.sort((a, b) => cmp(b.gapUsd, a.gapUsd));
}

export interface OverrideDistance {
  shirt: PricedShirt;
  /** Dan's price minus the MSRP: negative is below. */
  diffUsd: Usd;
  percent: string;
  direction: "above" | "below" | "at";
}

/** FR-020: each shirt Dan priced himself, and how far that is from its MSRP. */
export function overrideDistances(shirts: readonly PricedShirt[]): OverrideDistance[] {
  return shirts
    .filter((shirt) => shirt.priceIsDans)
    .map((shirt) => {
      const order = cmp(shirt.finalPriceUsd, shirt.msrpUsd);
      return {
        shirt,
        diffUsd: sub(shirt.finalPriceUsd, shirt.msrpUsd),
        percent: percentDiff(shirt.finalPriceUsd, shirt.msrpUsd),
        direction: order > 0 ? "above" : order < 0 ? "below" : "at",
      };
    });
}

export interface ChartBox {
  width: number;
  height: number;
  pad: number;
}

export interface Chart {
  points: (PricedShirt & { x: number; y: number })[];
  /** The MSRP line, as an SVG path. */
  curve: string;
  bands: { name: string; color: string; x0: number; x1: number }[];
  /** Price gridlines at powers of ten. */
  ticks: { y: number; label: string }[];
  xMax: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** FR-018: score across, price up on a log scale (so the exponential MSRP is a straight line). */
export function chartPoints(
  shirts: readonly PricedShirt[],
  tiers: readonly Tier[],
  msrp: MsrpSettings,
  box: ChartBox,
): Chart {
  const sorted = sortTiers(tiers);
  const xMax = Math.ceil(
    Math.max(10, ...shirts.map((s) => s.complexity), ...sorted.map((t) => t.minScore)) * 1.1,
  );
  const x = (score: number) => round1(box.pad + (score / xMax) * (box.width - 2 * box.pad));

  // The MSRP line, sampled across the chart, until the numbers run out (008 R7).
  const samples: { score: number; price: number }[] = [];
  for (let i = 0; i <= 40; i++) {
    const score = Math.round((xMax * i) / 40);
    try {
      samples.push({ score, price: Number(msrpUsd(score, msrp)) });
    } catch {
      break;
    }
  }
  const prices = [
    ...shirts.map((s) => Number(s.finalPriceUsd)),
    ...samples.map((s) => s.price),
  ].filter((p) => p > 0 && Number.isFinite(p));
  let lo = Math.log10(Math.min(...prices, 1));
  let hi = Math.log10(Math.max(...prices, 10));
  if (hi - lo < 1) [lo, hi] = [lo - 0.5, hi + 0.5];
  const y = (price: number) =>
    round1(
      box.pad +
        (1 - (Math.log10(Math.max(price, 10 ** lo)) - lo) / (hi - lo)) * (box.height - 2 * box.pad),
    );

  const ticks: Chart["ticks"] = [];
  for (let d = Math.ceil(lo); d <= Math.floor(hi); d++) {
    ticks.push({ y: y(10 ** d), label: `$${(10 ** d).toLocaleString("en-US")}` });
  }

  return {
    xMax,
    points: [...shirts]
      .sort((a, b) => a.complexity - b.complexity)
      .map((s) => ({ ...s, x: x(s.complexity), y: y(Number(s.finalPriceUsd)) })),
    curve: samples.map((s, i) => `${i ? " L" : "M"}${x(s.score)} ${y(s.price)}`).join(""),
    bands: sorted.map((tier, i) => ({
      name: tier.name,
      color: tier.badgeBgColor,
      x0: x(tier.minScore),
      x1: x(sorted[i + 1]?.minScore ?? xMax),
    })),
    ticks,
  };
}
