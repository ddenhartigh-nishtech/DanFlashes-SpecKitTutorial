import Link from "next/link";
import { PriceTag } from "@/components/PriceTag";
import { ShirtBadge } from "@/components/ShirtBadge";
import { ShirtImage } from "@/components/ShirtImage";
import { StockLine } from "@/components/StockLine";
import { copy } from "@/lib/copy";
import type { ShopperShirt } from "@/lib/data/shirts";
import type { StockLine as Line } from "@/lib/urgency/scarcity";

interface ShirtCardProps {
  shirt: ShopperShirt;
  placeholderUrl: string | null;
  priority?: boolean;
  /** h2 when the card sits directly under the page's h1 (listing); h3 under a section heading. */
  headingLevel?: 2 | 3;
  /** Fake scarcity (004): "Only 1 left!" and friends; nothing when it's off. */
  stock?: Line | null;
}

export function ShirtCard({
  shirt,
  placeholderUrl,
  priority,
  headingLevel = 3,
  stock = null,
}: ShirtCardProps) {
  const image = shirt.images[0];
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article
      data-testid="shirt-card"
      className="group border-ink bg-paper flex flex-col border-4 shadow-[6px_6px_0_var(--color-ink)] transition-transform hover:-translate-y-1"
    >
      <Link href={`/shirts/${shirt.slug}`} className="flex flex-1 flex-col">
        <div className="border-ink bg-ink relative aspect-square overflow-hidden border-b-4">
          <ShirtImage
            src={image?.url ?? null}
            alt={image?.alt ?? shirt.name}
            placeholderSrc={placeholderUrl}
            priority={priority}
            className="h-full w-full object-cover"
          />
          <span className="absolute top-2 left-2">
            <ShirtBadge tier={shirt.tier} />
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <Heading className="font-display group-hover:text-hot-pink text-lg leading-tight">
            {shirt.name}
          </Heading>
          <p className="text-sm font-semibold uppercase">{copy.styles[shirt.style]}</p>
          <div className="mt-auto flex flex-col items-start gap-2">
            <StockLine line={stock} />
            <PriceTag priceUsd={shirt.finalPriceUsd} />
          </div>
        </div>
      </Link>
    </article>
  );
}
