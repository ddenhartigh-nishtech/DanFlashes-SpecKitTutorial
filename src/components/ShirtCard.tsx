import Link from "next/link";
import { PriceTag } from "@/components/PriceTag";
import { ShirtBadge } from "@/components/ShirtBadge";
import { ShirtImage } from "@/components/ShirtImage";
import { copy } from "@/lib/copy";
import type { ShopperShirt } from "@/lib/data/shirts";

interface ShirtCardProps {
  shirt: ShopperShirt;
  placeholderUrl: string | null;
  priority?: boolean;
}

export function ShirtCard({ shirt, placeholderUrl, priority }: ShirtCardProps) {
  const image = shirt.images[0];
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
          <h3 className="font-display group-hover:text-hot-pink text-lg leading-tight">
            {shirt.name}
          </h3>
          <p className="text-sm font-semibold uppercase">{copy.styles[shirt.style]}</p>
          <div className="mt-auto">
            <PriceTag priceUsd={shirt.finalPriceUsd} />
          </div>
        </div>
      </Link>
    </article>
  );
}
