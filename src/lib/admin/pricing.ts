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
  /** Price gridlines: $0 and each fifth of the round top. */
  ticks: { y: number; label: string }[];
  xMax: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The first 1, 2 or 5 × 10ⁿ dollars at or above `price`: the chart's round top. */
function roundTop(price: number): number {
  for (let magnitude = 1; ; magnitude *= 10) {
    for (const m of [1, 2, 5]) if (m * magnitude >= price) return m * magnitude;
  }
}

/**
 * FR-018 (010 FR-014, R6): score across, price up on a linear axis from $0, so the straight MSRP is
 * a straight line.
 */
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

  // The MSRP line: two points, since it's straight.
  const ends = [0, xMax].map((score) => ({ score, price: Number(msrpUsd(score, msrp)) }));
  // At least $5, so a fifth of it is still a whole dollar.
  const top = roundTop(Math.max(5, ...shirts.map((s) => Number(s.finalPriceUsd)), ends[1].price));
  const y = (price: number) => round1(box.pad + (1 - price / top) * (box.height - 2 * box.pad));

  const ticks: Chart["ticks"] = [];
  for (let i = 0; i <= 5; i++) {
    const price = (top * i) / 5;
    ticks.push({ y: y(price), label: `$${price.toLocaleString("en-US")}` });
  }

  return {
    xMax,
    points: [...shirts]
      .sort((a, b) => a.complexity - b.complexity)
      .map((s) => ({ ...s, x: x(s.complexity), y: y(Number(s.finalPriceUsd)) })),
    curve: ends.map((e, i) => `${i ? " L" : "M"}${x(e.score)} ${y(e.price)}`).join(""),
    bands: sorted.map((tier, i) => ({
      name: tier.name,
      color: tier.badgeBgColor,
      x0: x(tier.minScore),
      x1: x(sorted[i + 1]?.minScore ?? xMax),
    })),
    ticks,
  };
}
