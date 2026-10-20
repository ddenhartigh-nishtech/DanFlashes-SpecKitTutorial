import Link from "next/link";
import type { Chart } from "@/lib/admin/pricing";
import { copy } from "@/lib/copy";
import { formatUsd } from "@/lib/money";

const p = copy.console.pricing;
export const CHART_BOX = { width: 720, height: 340, pad: 44 } as const;

/**
 * Price against complexity (008 FR-018): server-drawn SVG, quiet colors, nothing animated. The MSRP
 * is a straight line on a linear price axis from $0 (010 R6); tier bands sit behind; each dot
 * opens its shirt.
 */
export function PriceChart({ chart }: { chart: Chart }) {
  const { width, height, pad } = CHART_BOX;
  return (
    <svg
      data-testid="price-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={p.chartLabel}
      className="h-auto w-full"
    >
      {chart.bands.map((band) => (
        <g key={band.name}>
          <rect
            x={band.x0}
            y={pad}
            width={band.x1 - band.x0}
            height={height - 2 * pad}
            fill={band.color}
            opacity={0.12}
          />
          <text x={band.x0 + 4} y={pad - 6} fontSize={10} fill="#6f6b62">
            {band.name}
          </text>
        </g>
      ))}
      {chart.ticks.map((tick) => (
        <g key={tick.label}>
          <line x1={pad} x2={width - pad} y1={tick.y} y2={tick.y} stroke="#ddd6c8" />
          <text x={pad - 4} y={tick.y + 3} fontSize={9} textAnchor="end" fill="#6f6b62">
            {tick.label}
          </text>
        </g>
      ))}
      <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke="#6f6b62" />
      <text x={width / 2} y={height - 10} fontSize={11} textAnchor="middle" fill="#6f6b62">
        {p.score}
      </text>
      <path d={chart.curve} fill="none" stroke="#6f8a7f" strokeWidth={2} />
      {chart.points.map((point) => (
        <Link key={point.id} href={`/admin/shirts/${point.id}`}>
          <circle cx={point.x} cy={point.y} r={5} fill={point.priceIsDans ? "#3b3b3b" : "#6f8a7f"}>
            <title>{`${point.name}: ${p.scoreAndPrice(point.complexity, formatUsd(point.finalPriceUsd))}`}</title>
          </circle>
        </Link>
      ))}
    </svg>
  );
}
