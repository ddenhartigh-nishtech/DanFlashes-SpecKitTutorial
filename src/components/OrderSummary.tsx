import Link from "next/link";
import { PriceTag } from "@/components/PriceTag";
import { ShirtBadge } from "@/components/ShirtBadge";
import { ShirtImage } from "@/components/ShirtImage";
import { copy } from "@/lib/copy";
import { formatUsd, type Usd } from "@/lib/money";
import type { SummaryLine } from "@/lib/orders/orders";

interface OrderSummaryProps {
  lines: SummaryLine[];
  subtotalUsd: Usd;
  shippingUsd: Usd;
  taxUsd: Usd;
  totalUsd: Usd;
  placeholderUrl: string | null;
}

/** Lines, then Subtotal / Shipping $0.00 / Tax $0.00 / Total — used by checkout, receipts, history. */
export function OrderSummary(props: OrderSummaryProps) {
  return (
    <div
      data-testid="order-summary"
      className="border-ink bg-paper border-4 shadow-[6px_6px_0_var(--color-ink)]"
    >
      <ul className="divide-ink divide-y-2">
        {props.lines.map((line) => (
          <li
            key={`${line.slug}-${line.size}`}
            className="grid grid-cols-[4rem_1fr] gap-3 p-3 sm:grid-cols-[5rem_1fr]"
          >
            <div className="bg-ink border-ink aspect-square border-2">
              <ShirtImage
                src={line.image?.url ?? null}
                alt={line.image?.alt ?? line.name}
                placeholderSrc={props.placeholderUrl}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Link
                href={`/shirts/${line.slug}`}
                className="font-display hover:text-hot-pink leading-tight"
              >
                {line.name}
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <ShirtBadge tier={line.tier} />
                <span className="font-semibold">
                  Size {line.size} · {line.quantity} × {formatUsd(line.unitPriceUsd)}
                </span>
              </div>
              <div className="self-end">
                <PriceTag priceUsd={line.lineTotalUsd} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <dl className="border-ink grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t-4 p-3 font-semibold">
        <dt>{copy.cart.subtotal}</dt>
        <dd data-testid="subtotal" className="text-right tabular-nums">
          {formatUsd(props.subtotalUsd)}
        </dd>
        <dt>{copy.checkout.shipping}</dt>
        <dd data-testid="shipping" className="text-right tabular-nums">
          {formatUsd(props.shippingUsd)}
        </dd>
        <dt>{copy.checkout.tax}</dt>
        <dd data-testid="tax" className="text-right tabular-nums">
          {formatUsd(props.taxUsd)}
        </dd>
        <dt className="font-display mt-2 uppercase">{copy.checkout.total}</dt>
        <dd className="mt-2 text-right">
          <span data-testid="total">
            <PriceTag priceUsd={props.totalUsd} />
          </span>
        </dd>
      </dl>
    </div>
  );
}
