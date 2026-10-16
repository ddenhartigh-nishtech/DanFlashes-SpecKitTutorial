import type { Metadata } from "next";
import { Suspense } from "react";
import { loadStorefront } from "@/app/_data/storefront";
import { FilterDrawer } from "@/components/FilterDrawer";
import { ListingFilters } from "@/components/ListingFilters";
import { ShirtCard } from "@/components/ShirtCard";
import { applyListing, parseListingQuery } from "@/lib/catalog/listing";
import { copy } from "@/lib/copy";
import { toShopperShirt } from "@/lib/data/shirts";

export const metadata: Metadata = { title: copy.nav.shirts };

export default function ShirtsPage({ searchParams }: PageProps<"/shirts">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display field-backing w-fit text-3xl leading-tight md:text-5xl">
        {copy.listing.heading}
      </h1>
      <Suspense fallback={<ListingFallback />}>
        <Listing searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Listing({ searchParams }: Pick<PageProps<"/shirts">, "searchParams">) {
  const query = parseListingQuery(await searchParams);
  const { shirts, tiers, placeholderUrl, stockOf } = await loadStorefront();
  const results = applyListing(shirts, query).map(toShopperShirt);

  return (
    <div className="grid gap-6 md:grid-cols-[16rem_1fr] md:items-start">
      <FilterDrawer label={copy.listing.filters}>
        <ListingFilters tiers={tiers} query={query} />
      </FilterDrawer>

      <section aria-label={copy.nav.shirts}>
        <p className="font-display bg-highlighter mb-4 inline-block px-2 text-sm uppercase">
          {copy.listing.count(results.length)}
        </p>
        {results.length === 0 ? (
          <p className="solid-backing p-6 text-lg">{copy.listing.empty}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((shirt, i) => (
              <li key={shirt.id} className="flex">
                <ShirtCard
                  shirt={shirt}
                  placeholderUrl={placeholderUrl}
                  priority={i < 2}
                  headingLevel={2}
                  stock={stockOf(shirt)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ListingFallback() {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="loud-dots border-ink aspect-[3/4] animate-pulse border-4 opacity-60"
        />
      ))}
    </div>
  );
}
