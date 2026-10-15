import { formatUsd, type Usd } from "@/lib/money";

export function PriceTag({ priceUsd, size = "md" }: { priceUsd: Usd; size?: "md" | "lg" }) {
  const text = size === "lg" ? "text-2xl md:text-3xl" : "text-lg";
  return (
    <span
      data-testid="price"
      // max-w-full + overflow-wrap: a sky's-the-limit total wraps instead of spilling out of its box.
      className={`font-display solid-backing inline-block max-w-full px-3 py-1 [overflow-wrap:anywhere] tabular-nums ${text}`}
    >
      {formatUsd(priceUsd)}
    </span>
  );
}
