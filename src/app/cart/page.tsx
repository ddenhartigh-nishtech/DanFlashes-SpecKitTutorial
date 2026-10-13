import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { removeCartItem } from "@/actions/cart";
import { currentCartId } from "@/app/_data/request";
import { loadStorefront } from "@/app/_data/storefront";
import { CartQuantityForm } from "@/components/CartQuantityForm";
import { PriceTag } from "@/components/PriceTag";
import { ShirtBadge } from "@/components/ShirtBadge";
import { ShirtCard } from "@/components/ShirtCard";
import { ShirtImage } from "@/components/ShirtImage";
import { getCartView, type CartLine, type RemovedLine } from "@/lib/cart/cart";
import { mostExpensive } from "@/lib/catalog/listing";
import { sortTiers } from "@/lib/catalog/tiers";
import { copy } from "@/lib/copy";
import { toShopperShirt } from "@/lib/data/shirts";
import { getDb } from "@/lib/db/client";

export const metadata: Metadata = { title: copy.cart.title };

export default function CartPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl leading-tight md:text-5xl">{copy.cart.heading}</h1>
      <Suspense
        fallback={<div className="loud-dots border-ink h-64 animate-pulse border-4 opacity-60" />}
      >
        <CartContents />
      </Suspense>
    </div>
  );
}

async function CartContents() {
  const view = getCartView(getDb(), await currentCartId());
  const { shirts, tiers, placeholderUrl } = await loadStorefront();

  if (view.lines.length === 0) {
    const spotlight = mostExpensive(shirts);
    const topTier = sortTiers(tiers).at(-1);
    return (
      <>
        <RemovedNotice removed={view.removed} />
        <section
          data-testid="empty-cart"
          className="grid gap-6 md:grid-cols-[1fr_20rem] md:items-start"
        >
          <div className="loud-stripes border-ink border-4 p-4">
            <div className="solid-backing p-6">
              <h2 className="font-display text-highlighter text-3xl md:text-5xl">
                {copy.cart.emptyTitle}
              </h2>
              <p className="mt-3 text-lg">{copy.cart.emptyBody}</p>
              <Link
                href={`/shirts?tier=${topTier?.id ?? ""}&sort=price-desc`}
                className="font-display bg-hot-pink text-paper mt-5 inline-flex min-h-11 items-center px-4 uppercase"
              >
                {copy.cart.emptyCta}
              </Link>
            </div>
          </div>
          {spotlight ? (
            <div data-testid="spotlight" className="flex">
              <ShirtCard shirt={toShopperShirt(spotlight)} placeholderUrl={placeholderUrl} />
            </div>
          ) : null}
        </section>
      </>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_18rem] md:items-start">
      <div className="flex flex-col gap-4">
        <RemovedNotice removed={view.removed} />
        <ul className="flex flex-col gap-4">
          {view.lines.map((line) => (
            <CartLineRow
              key={`${line.shirt.slug}-${line.size}`}
              line={line}
              placeholderUrl={placeholderUrl}
            />
          ))}
        </ul>
      </div>
      <aside className="border-ink bg-paper flex flex-col gap-3 border-4 p-4 shadow-[6px_6px_0_var(--color-ink)]">
        <p className="font-display flex items-center justify-between gap-3 uppercase">
          {copy.cart.subtotal}
          <PriceTag priceUsd={view.subtotalUsd} />
        </p>
        <Link
          href="/checkout"
          className="font-display bg-hot-pink text-paper flex min-h-12 items-center justify-center px-4 text-lg uppercase shadow-[4px_4px_0_var(--color-ink)]"
        >
          {copy.cart.checkout}
        </Link>
      </aside>
    </div>
  );
}

function RemovedNotice({ removed }: { removed: RemovedLine[] }) {
  if (removed.length === 0) return null;
  return (
    <div
      role="status"
      data-testid="audit-notice"
      className="bg-safety-orange border-ink border-4 p-3 font-bold"
    >
      <p>{copy.cart.removedNotice}</p>
      <ul className="mt-1 list-disc pl-6">
        {removed.map((r) => (
          <li key={`${r.slug}-${r.size}`}>
            {r.name} ({r.size} × {r.quantity})
          </li>
        ))}
      </ul>
    </div>
  );
}

function CartLineRow({ line, placeholderUrl }: { line: CartLine; placeholderUrl: string | null }) {
  const image = line.shirt.images[0];
  return (
    <li
      data-testid="cart-line"
      className="border-ink bg-paper grid grid-cols-[6rem_1fr] gap-3 border-4 p-3 shadow-[4px_4px_0_var(--color-ink)] sm:grid-cols-[8rem_1fr]"
    >
      <Link
        href={`/shirts/${line.shirt.slug}`}
        className="bg-ink border-ink aspect-square border-2"
      >
        <ShirtImage
          src={image?.url ?? null}
          alt={image?.alt ?? line.shirt.name}
          placeholderSrc={placeholderUrl}
          className="h-full w-full object-contain"
        />
      </Link>
      <div className="flex flex-col gap-2">
        <Link
          href={`/shirts/${line.shirt.slug}`}
          className="font-display hover:text-hot-pink text-lg leading-tight"
        >
          {line.shirt.name}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <ShirtBadge tier={line.shirt.tier} />
          <span className="font-display text-sm">{copy.cart.size(line.size)}</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <CartQuantityForm slug={line.shirt.slug} size={line.size} quantity={line.quantity} />
          <form action={removeCartItem}>
            <input type="hidden" name="slug" value={line.shirt.slug} />
            <input type="hidden" name="size" value={line.size} />
            <button
              type="submit"
              className="font-display min-h-11 px-3 text-sm uppercase underline decoration-4 underline-offset-4"
            >
              {copy.cart.remove}
            </button>
          </form>
          <span className="ml-auto">
            <PriceTag priceUsd={line.lineTotalUsd} />
          </span>
        </div>
      </div>
    </li>
  );
}
