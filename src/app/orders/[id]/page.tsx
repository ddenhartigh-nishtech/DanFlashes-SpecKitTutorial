import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { currentUser } from "@/app/_data/request";
import { OrderSummary } from "@/components/OrderSummary";
import { PerDiemCelebration } from "@/components/PerDiemCelebration";
import { copy } from "@/lib/copy";
import { getPlaceholderUrl, getSettings } from "@/lib/data/settings";
import { getDb } from "@/lib/db/client";
import { getOrderForUser } from "@/lib/orders/orders";

export default function OrderPage({ params }: PageProps<"/orders/[id]">) {
  return (
    <Suspense
      fallback={<div className="loud-dots border-ink h-64 animate-pulse border-4 opacity-60" />}
    >
      <OrderContents params={params} />
    </Suspense>
  );
}

async function OrderContents({ params }: Pick<PageProps<"/orders/[id]">, "params">) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=/orders/${encodeURIComponent(id)}`);
  const db = getDb();
  const order = /^\d+$/.test(id) ? getOrderForUser(db, Number(id), user.id) : null;
  if (!order) notFound(); // someone else's order looks exactly like a missing one

  const celebrate = order.perDiemDrained && getSettings(db).perDiemDrain;
  return (
    <div className="flex flex-col gap-6">
      {celebrate ? <PerDiemCelebration /> : null}
      <title>{`${copy.order.title(order.number)} · ${copy.brand.name}`}</title>
      <section className="loud-stripes border-ink border-4 p-4">
        <div className="solid-backing p-6">
          <p className="font-display text-highlighter text-sm">{copy.order.title(order.number)}</p>
          <h1 className="font-display text-highlighter mt-1 text-4xl md:text-6xl">
            {copy.order.heading}
          </h1>
          <p className="mt-3 text-lg">{copy.order.body}</p>
          <p
            data-testid="payment"
            className="bg-highlighter text-ink mt-4 inline-block px-3 py-1 font-bold"
          >
            {order.payment.method === "card"
              ? copy.order.paidCard(order.payment.brand, order.payment.last4)
              : copy.order.paidFlash}
          </p>
        </div>
      </section>
      <OrderSummary
        lines={order.lines}
        subtotalUsd={order.subtotalUsd}
        shippingUsd={order.shippingUsd}
        taxUsd={order.taxUsd}
        totalUsd={order.totalUsd}
        placeholderUrl={getPlaceholderUrl(db, getSettings(db))}
      />
      <div className="flex flex-wrap gap-3">
        <Link
          href="/shirts"
          className="font-display bg-hot-pink text-paper inline-flex min-h-11 items-center px-4 uppercase"
        >
          {copy.order.keepShopping}
        </Link>
        <Link
          href="/account"
          className="font-display border-ink inline-flex min-h-11 items-center border-4 px-4 uppercase"
        >
          {copy.order.viewAccount}
        </Link>
      </div>
    </div>
  );
}
