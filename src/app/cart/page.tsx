import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { removeCartItem } from "@/actions/cart";
import { currentCartId } from "@/app/_data/request";
import { loadStorefront } from "@/app/_data/storefront";
import { CartQuantityForm } from "@/components/CartQuantityForm";
import { ConfirmTwice } from "@/components/ConfirmTwice";
import { Countdown } from "@/components/Countdown";
import { PriceTag } from "@/components/PriceTag";
import { ShirtBadge } from "@/components/ShirtBadge";
import { ShirtCard } from "@/components/ShirtCard";
import { ShirtImage } from "@/components/ShirtImage";
import { StockLine } from "@/components/StockLine";
import { getCartView, type CartLine, type RemovalReason, type RemovedLine } from "@/lib/cart/cart";
import { mostExpensive } from "@/lib/catalog/listing";
import { sortTiers } from "@/lib/catalog/tiers";
import { copy } from "@/lib/copy";
import { getSettings } from "@/lib/data/settings";
import { toShopperShirt } from "@/lib/data/shirts";
import { getDb } from "@/lib/db/client";
import { showCountdown } from "@/lib/urgency/countdown";
import { cartStockLine, type StockLine as Line } from "@/lib/urgency/scarcity";
import { labelFor } from "@/lib/shaming/labels";

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
  const db = getDb();
  const view = getCartView(db, await currentCartId());
  const settings = getSettings(db);
  const removeLabel = labelFor("remove", settings.confirmshaming);
  const { shirts, tiers, placeholderUrl, stockOf } = await loadStorefront();

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
              <ShirtCard
                shirt={toShopperShirt(spotlight)}
                placeholderUrl={placeholderUrl}
                stock={stockOf(spotlight)}
              />
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
              removeLabel={removeLabel}
              stock={cartStockLine(stockOf(line.shirt), line.quantity)}
              roachMotel={settings.roachMotel}
              confirmshaming={settings.confirmshaming}
            />
          ))}
        </ul>
      </div>
      <aside
        data-testid="cart-summary"
        className="border-ink bg-paper flex min-w-0 flex-col gap-3 border-4 p-4 shadow-[6px_6px_0_var(--color-ink)]"
      >
        {showCountdown(settings, "hold", view.lines.length) ? (
          <Countdown kind="hold" label={copy.urgency.hold} />
        ) : null}
        <p className="font-display flex flex-wrap items-center justify-between gap-3 uppercase">
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

const REMOVAL_NOTICES: Record<RemovalReason, string> = {
  retired: copy.cart.removedNotice,
  bland: copy.cart.blandRemovedNotice,
};

function RemovedNotice({ removed }: { removed: RemovedLine[] }) {
  if (removed.length === 0) return null;
  const groups = (Object.keys(REMOVAL_NOTICES) as RemovalReason[])
    .map((reason) => ({ reason, lines: removed.filter((r) => r.reason === reason) }))
    .filter((g) => g.lines.length > 0);
  return (
    <div
      role="status"
      data-testid="audit-notice"
      className="bg-safety-orange border-ink flex flex-col gap-2 border-4 p-3 font-bold"
    >
      {groups.map(({ reason, lines }) => (
        <div key={reason} data-reason={reason}>
          <p>{REMOVAL_NOTICES[reason]}</p>
          <ul className="mt-1 list-disc pl-6">
            {lines.map((r) => (
              <li key={`${r.slug}-${r.size}`}>
                {r.name} ({r.size} × {r.quantity})
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CartLineRow({
  line,
  placeholderUrl,
  removeLabel,
  stock,
  roachMotel,
  confirmshaming,
}: {
  line: CartLine;
  placeholderUrl: string | null;
  removeLabel: string;
  stock: Line | null;
  /** The roach motel (005 US2): Remove and any lower quantity ask twice first. */
  roachMotel: boolean;
  confirmshaming: boolean;
}) {
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
        <StockLine line={stock} />
        <div className="flex flex-wrap items-end gap-3">
          <CartQuantityForm
            slug={line.shirt.slug}
            size={line.size}
            quantity={line.quantity}
            roachMotel={roachMotel}
            lowerYesLabel={labelFor("lowerYes", confirmshaming)}
          />
          <ConfirmTwice enabled={roachMotel} yesLabel={labelFor("removeYes", confirmshaming)}>
            <form action={removeCartItem}>
              <input type="hidden" name="slug" value={line.shirt.slug} />
              <input type="hidden" name="size" value={line.size} />
              <button
                type="submit"
                className="font-display min-h-11 px-3 text-sm uppercase underline decoration-4 underline-offset-4"
              >
                {removeLabel}
              </button>
            </form>
          </ConfirmTwice>
          <span className="ml-auto">
            <PriceTag priceUsd={line.lineTotalUsd} />
          </span>
        </div>
      </div>
    </li>
  );
}
