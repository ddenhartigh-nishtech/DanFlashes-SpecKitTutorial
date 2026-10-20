import { describe, expect, it } from "vitest";
import {
  chartPoints,
  findInversions,
  overrideDistances,
  type PricedShirt,
} from "@/lib/admin/pricing";
import type { Tier } from "@/lib/catalog/types";
import { DEFAULT_MSRP_SETTINGS, msrpUsd } from "@/lib/pricing/msrp";

const tiers: Tier[] = [
  {
    id: 1,
    name: "BLAND",
    tagline: null,
    minScore: 0,
    badgeBgColor: "#C8B89A",
    badgeTextColor: "#3B3B3B",
  },
  {
    id: 2,
    name: "Complicated",
    tagline: null,
    minScore: 10,
    badgeBgColor: "#FF2D95",
    badgeTextColor: "#FFFFFF",
  },
  {
    id: 3,
    name: "Very",
    tagline: null,
    minScore: 25,
    badgeBgColor: "#00E5FF",
    badgeTextColor: "#000000",
  },
];

/** A shirt at its MSRP, or at Dan's price. */
function shirt(id: number, complexity: number, dans?: string): PricedShirt {
  const msrp = msrpUsd(complexity, DEFAULT_MSRP_SETTINGS);
  return {
    id,
    slug: `s-${id}`,
    name: `Shirt ${id}`,
    complexity,
    msrpUsd: msrp,
    finalPriceUsd: dans ?? msrp,
    priceIsDans: dans !== undefined,
  };
}

describe("findInversions (008 FR-019)", () => {
  it("flags exactly the pairs where the more complicated shirt costs less, with the gap", () => {
    const shirts = [shirt(1, 5), shirt(2, 20, "900.00"), shirt(3, 40, "800.00"), shirt(4, 60)];
    expect(findInversions(shirts)).toEqual([
      { simpler: shirts[1], complex: shirts[2], gapUsd: "100.00" },
    ]);
  });

  it("lists every simpler shirt a cheap complicated one undercuts, biggest gap first", () => {
    const shirts = [shirt(1, 10, "500.00"), shirt(2, 20, "700.00"), shirt(3, 30, "100.00")];
    expect(findInversions(shirts).map((p) => [p.simpler.id, p.complex.id, p.gapUsd])).toEqual([
      [2, 3, "600.00"],
      [1, 3, "400.00"],
    ]);
  });

  it("never flags shirts with the same score, or a catalog in order", () => {
    expect(findInversions([shirt(1, 20, "900.00"), shirt(2, 20, "100.00")])).toEqual([]);
    expect(findInversions([shirt(1, 5), shirt(2, 15), shirt(3, 30)])).toEqual([]);
    expect(findInversions([shirt(1, 5)])).toEqual([]);
    expect(findInversions([])).toEqual([]);
  });
});

describe("overrideDistances (008 FR-020)", () => {
  it("gives each of Dan's prices its distance from the MSRP, in dollars and percent", () => {
    const shirts = [
      shirt(1, 10, "450.00"),
      shirt(2, 22, "500.00"),
      shirt(3, 30),
      shirt(4, 10, "300.00"),
    ];
    expect(overrideDistances(shirts)).toEqual([
      { shirt: shirts[0], diffUsd: "150.00", percent: "50.0", direction: "above" },
      { shirt: shirts[1], diffUsd: "-100.00", percent: "-16.7", direction: "below" },
      { shirt: shirts[3], diffUsd: "0.00", percent: "0.0", direction: "at" },
    ]);
  });
});

describe("chartPoints (008 FR-018, R12)", () => {
  const box = { width: 600, height: 300, pad: 40 };
  const shirts = [shirt(1, 3), shirt(2, 15), shirt(3, 30, "999.99"), shirt(4, 80)];
  const chart = chartPoints(shirts, tiers, DEFAULT_MSRP_SETTINGS, box);

  it("places every shirt inside the plot, left to right by score and up by price", () => {
    for (const p of chart.points) {
      expect(p.x).toBeGreaterThanOrEqual(box.pad);
      expect(p.x).toBeLessThanOrEqual(box.width - box.pad);
      expect(p.y).toBeGreaterThanOrEqual(box.pad);
      expect(p.y).toBeLessThanOrEqual(box.height - box.pad);
    }
    const xs = chart.points.map((p) => p.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    const [cheap, , , dear] = chart.points;
    expect(dear.y).toBeLessThan(cheap.y); // higher price, higher on the page (smaller y)
  });

  it("draws the MSRP as one line, and a band for every tier", () => {
    expect(chart.curve).toMatch(/^M[\d.]+ [\d.]+( L[\d.]+ [\d.]+)+$/);
    expect(chart.bands.map((b) => b.name)).toEqual(["BLAND", "Complicated", "Very"]);
    for (const band of chart.bands) expect(band.x1).toBeGreaterThan(band.x0);
  });

  it("draws the straight MSRP as two points, with every shirt at its MSRP on it (010 FR-014)", () => {
    const [start, end] = chart.curve
      .replace(/^M/, "")
      .split(" L")
      .map((pair) => pair.split(" ").map(Number));
    expect(chart.curve.split(" L")).toHaveLength(2);
    for (const p of chart.points.filter((p) => !p.priceIsDans)) {
      const along = (p.x - start[0]) / (end[0] - start[0]);
      expect(Math.abs(start[1] + along * (end[1] - start[1]) - p.y)).toBeLessThanOrEqual(0.1);
    }
    const dans = chart.points.find((p) => p.priceIsDans)!;
    const along = (dans.x - start[0]) / (end[0] - start[0]);
    expect(dans.y).toBeLessThan(start[1] + along * (end[1] - start[1]) - 1); // above the line
  });

  it("puts price on a linear axis from $0, a fifth of a round top apart (R6)", () => {
    // The top price is the MSRP at the right edge: score 88, $2,250.00, so the axis tops at $5,000.
    expect(chart.ticks.map((t) => t.label)).toEqual([
      "$0",
      "$1,000",
      "$2,000",
      "$3,000",
      "$4,000",
      "$5,000",
    ]);
    expect(chart.ticks[0].y).toBe(box.height - box.pad);
    expect(chart.ticks[5].y).toBe(box.pad);
    const gaps = chart.ticks.slice(1).map((t, i) => chart.ticks[i].y - t.y);
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0], 1);
  });

  it("copes with nothing to plot", () => {
    expect(chartPoints([], tiers, DEFAULT_MSRP_SETTINGS, box).points).toEqual([]);
  });
});
