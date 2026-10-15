import Link from "next/link";
import { Suspense } from "react";
import { loadStorefront } from "@/app/_data/storefront";
import { ShirtCard } from "@/components/ShirtCard";
import { featuredShirts } from "@/lib/catalog/listing";
import { copy } from "@/lib/copy";
import { toShopperShirt } from "@/lib/data/shirts";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="loud-stripes border-ink border-4 p-4 md:p-10">
        <div className="solid-backing max-w-3xl p-6 md:p-10">
          <h1 className="font-display text-highlighter text-4xl leading-none md:text-7xl">
            {copy.home.headline}
          </h1>
          <p className="mt-4 text-lg md:text-2xl">{copy.home.subhead}</p>
          <Link
            href="/shirts"
            className="font-display bg-hot-pink text-paper mt-6 inline-flex min-h-12 items-center px-6 text-lg uppercase shadow-[4px_4px_0_var(--color-highlighter)]"
          >
            {copy.home.cta}
          </Link>
        </div>
      </section>

      <section aria-labelledby="featured-heading" className="flex flex-col gap-4">
        <h2 id="featured-heading" className="font-display text-2xl md:text-4xl">
          {copy.home.featuredHeading}
        </h2>
        <Suspense fallback={<FeaturedFallback />}>
          <Featured />
        </Suspense>
      </section>
    </div>
  );
}

async function Featured() {
  const { shirts, placeholderUrl, stockOf } = await loadStorefront();
  const picks = featuredShirts(shirts).map(toShopperShirt);
  return (
    <ul data-testid="featured" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {picks.map((shirt, i) => (
        <li key={shirt.id} className="flex">
          <ShirtCard
            shirt={shirt}
            placeholderUrl={placeholderUrl}
            priority={i === 0}
            stock={stockOf(shirt)}
          />
        </li>
      ))}
    </ul>
  );
}

function FeaturedFallback() {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="loud-dots border-ink aspect-[3/4] animate-pulse border-4 opacity-60"
        />
      ))}
    </div>
  );
}
