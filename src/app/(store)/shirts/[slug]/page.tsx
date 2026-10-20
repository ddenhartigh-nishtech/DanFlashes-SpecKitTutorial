import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadShirt } from "@/app/_data/storefront";
import { AddToCart } from "@/components/AddToCart";
import { Countdown } from "@/components/Countdown";
import { PriceTag } from "@/components/PriceTag";
import { SocialProof } from "@/components/SocialProof";
import { StockLine } from "@/components/StockLine";
import { ShirtBadge } from "@/components/ShirtBadge";
import { ZoomViewer } from "@/components/ZoomViewer";
import { copy } from "@/lib/copy";
import { toShopperShirt } from "@/lib/data/shirts";
import { formatUsd } from "@/lib/money";
import { shameFor } from "@/lib/shaming/loop";
import { showCountdown } from "@/lib/urgency/countdown";

export default function ShirtPage({ params }: PageProps<"/shirts/[slug]">) {
  return (
    <Suspense fallback={<DetailFallback />}>
      <ShirtDetail params={params} />
    </Suspense>
  );
}

async function ShirtDetail({ params }: Pick<PageProps<"/shirts/[slug]">, "params">) {
  const { slug } = await params;
  const {
    shirt: catalogShirt,
    placeholderUrl,
    blandShaming,
    confirmshaming,
    ladder,
    stock,
    countdownTimers,
    proof,
    buyable,
    signedIn,
    surchargeUsd,
    dialOn,
  } = await loadShirt(slug);
  if (!catalogShirt) notFound();
  const shirt = toShopperShirt(catalogShirt);
  const retired = shirt.status === "inactive";
  // A one-of-a-kind shirt that's somebody else's: look, but there's no way to buy it (007 FR-018).
  const taken = !retired && !buyable;
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
        <h1 className="font-display field-backing w-fit text-3xl leading-tight md:text-5xl">
          {shirt.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <ShirtBadge tier={shirt.tier} showTagline />
          <span className="field-backing text-sm font-semibold uppercase">
            {copy.styles[shirt.style]}
          </span>
        </div>
        {retired ? null : (
          <div className="flex flex-wrap items-center gap-3">
            <PriceTag priceUsd={shirt.finalPriceUsd} size="lg" />
            {taken ? null : <StockLine line={stock} />}
            {!taken && showCountdown({ countdownTimers }, "deal", 0) ? (
              <Countdown kind="deal" label={copy.urgency.deal} />
            ) : null}
          </div>
        )}
        {!retired && !taken && surchargeUsd ? (
          <p data-steady data-testid="surcharge-note" className="field-backing w-fit font-semibold">
            {copy.surcharge.note(formatUsd(surchargeUsd))}
          </p>
        ) : null}
        <p className="bg-paper text-lg">{shirt.description}</p>
        {taken ? (
          <div data-testid="one-of-a-kind" className="solid-backing flex flex-col gap-2 p-4">
            <p className="font-display text-xl uppercase">{copy.oneOfAKind.taken}</p>
            <p>{copy.oneOfAKind.takenLine}</p>
            <p className="flex flex-wrap gap-4">
              {signedIn ? null : (
                <Link
                  href={`/sign-in?next=${encodeURIComponent(`/shirts/${shirt.slug}`)}`}
                  className="underline"
                >
                  {copy.oneOfAKind.signIn}
                </Link>
              )}
              {dialOn ? (
                <Link href="/how-complicated" className="underline">
                  {copy.oneOfAKind.makeYourOwn}
                </Link>
              ) : null}
            </p>
          </div>
        ) : null}
        {retired || taken ? null : (
          <AddToCart
            slug={shirt.slug}
            placeholderUrl={placeholderUrl}
            shame={shameFor({ isBland: shirt.tier.isBland, blandShaming, confirmshaming }, ladder)}
          />
        )}
        <SocialProof proof={proof} />
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
