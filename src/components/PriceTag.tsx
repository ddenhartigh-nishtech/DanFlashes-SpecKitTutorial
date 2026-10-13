import { formatUsd, type Usd } from "@/lib/money";

export function PriceTag({ priceUsd, size = "md" }: { priceUsd: Usd; size?: "md" | "lg" }) {
  const text = size === "lg" ? "text-2xl md:text-3xl" : "text-lg";
  return (
    <span
      data-testid="price"
      className={`font-display solid-backing inline-block px-3 py-1 tabular-nums ${text}`}
    >
      {formatUsd(priceUsd)}
    </span>
  );
}
