import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadShirt } from "@/app/_data/storefront";
import { AddToCart } from "@/components/AddToCart";
import { PriceTag } from "@/components/PriceTag";
import { ShirtBadge } from "@/components/ShirtBadge";
import { ZoomViewer } from "@/components/ZoomViewer";
import { copy } from "@/lib/copy";
import { toShopperShirt } from "@/lib/data/shirts";

export default function ShirtPage({ params }: PageProps<"/shirts/[slug]">) {
  return (
    <Suspense fallback={<DetailFallback />}>
      <ShirtDetail params={params} />
    </Suspense>
  );
}

async function ShirtDetail({ params }: Pick<PageProps<"/shirts/[slug]">, "params">) {
  const { slug } = await params;
  const { shirt: catalogShirt, placeholderUrl } = await loadShirt(slug);
  if (!catalogShirt) notFound();
  const shirt = toShopperShirt(catalogShirt);
  const retired = shirt.status === "inactive";
  const image = shirt.images[0];

  return (
    <article className="grid gap-8 md:grid-cols-2 md:items-start">
      <title>{`${shirt.name} · ${copy.brand.name}`}</title>
      <ZoomViewer
        src={image?.url ?? null}
        alt={image?.alt ?? shirt.name}
        placeholderSrc={placeholderUrl}
        overlay={<ShirtBadge tier={shirt.tier} />}
      />

      <div className="flex flex-col gap-5">
        {retired ? (
          <p data-testid="retired-banner" className="loud-stripes border-ink border-4 p-2">
            <span className="font-display solid-backing inline-block px-3 py-1 text-lg uppercase">
              {copy.shirt.retired}
            </span>
          </p>
        ) : null}
        <h1 className="font-display text-3xl leading-tight md:text-5xl">{shirt.name}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <ShirtBadge tier={shirt.tier} showTagline />
          <span className="text-sm font-semibold uppercase">{copy.styles[shirt.style]}</span>
        </div>
        {retired ? null : <PriceTag priceUsd={shirt.finalPriceUsd} size="lg" />}
        <p className="bg-paper text-lg">{shirt.description}</p>
        {retired ? null : <AddToCart slug={shirt.slug} />}
      </div>
    </article>
  );
}

function DetailFallback() {
  return (
    <div aria-hidden className="grid gap-8 md:grid-cols-2">
      <div className="loud-dots border-ink aspect-square animate-pulse border-4 opacity-60" />
      <div className="loud-dots border-ink h-64 animate-pulse border-4 opacity-60" />
    </div>
  );
}
