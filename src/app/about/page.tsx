import type { Metadata } from "next";
import { Suspense } from "react";
import { loadStorefront } from "@/app/_data/storefront";
import { ShirtCard } from "@/components/ShirtCard";
import { mostExpensive } from "@/lib/catalog/listing";
import { copy } from "@/lib/copy";
import { toShopperShirt } from "@/lib/data/shirts";

export const metadata: Metadata = { title: copy.about.title };

/** Dan's bio is brand copy, so it ships in the static shell; Exhibit A reads the live catalog. */
export default function AboutPage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="loud-stripes border-ink border-4 p-4 md:p-10">
        <div className="solid-backing max-w-3xl p-6 md:p-10">
          <h1 className="font-display text-highlighter text-4xl leading-none md:text-6xl">
            {copy.about.heading}
          </h1>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-[1fr_20rem] md:items-start">
        <div className="flex flex-col gap-6">
          {copy.about.sections.map((section) => (
            <section
              key={section.heading}
              className="border-ink bg-paper border-4 p-5 shadow-[6px_6px_0_var(--color-hot-pink)] md:p-8"
            >
              <h2 className="font-display text-2xl leading-tight md:text-3xl">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-lg">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <Suspense fallback={<ExhibitFallback />}>
          <ExhibitA />
        </Suspense>
      </div>
    </div>
  );
}

async function ExhibitA() {
  const { shirts, placeholderUrl } = await loadStorefront();
  const shirt = mostExpensive(shirts);
  if (!shirt) return null;
  return (
    <section
      data-testid="exhibit-a"
      aria-labelledby="exhibit-a-heading"
      className="loud-dots border-ink flex flex-col gap-4 border-4 p-4 md:sticky md:top-28"
    >
      <div className="solid-backing p-4">
        <h2 id="exhibit-a-heading" className="font-display text-highlighter text-3xl">
          {copy.about.exhibitA.heading}
        </h2>
        <p className="mt-2 font-semibold">{copy.about.exhibitA.intro}</p>
      </div>
      <ShirtCard shirt={toShopperShirt(shirt)} placeholderUrl={placeholderUrl} headingLevel={3} />
    </section>
  );
}

function ExhibitFallback() {
  return (
    <div aria-hidden className="loud-dots border-ink h-96 animate-pulse border-4 opacity-60" />
  );
}
