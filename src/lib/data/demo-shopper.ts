/**
 * Demo shoppers for local development (`npm run db:seed-demo`). Built through the real sign-up,
 * top-up, and checkout code paths, so demo data always obeys the same rules as real data.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { signUp } from "@/lib/auth/accounts";
import { addItem, getCartView, getOrCreateCart } from "@/lib/cart/cart";
import { placeOrder } from "@/lib/checkout/place-order";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { topUp } from "@/lib/flash-credit/ledger";
import { connectStream } from "@/lib/streams/streams";

const DEMO_CARD = { number: "4242424242424242", expiry: "12/39", cvc: "123" };

export interface DemoShopper {
  email: string;
  password: string;
  displayName: string;
  creditUsd: string;
  pastOrder: { slug: string; size: string };
  /** An ongoing, recurring per diem connected after the past order, so the gauge shows (003 R9). */
  perDiem?: { amountUsd: string };
}

/** Idempotent: an existing account with the same email is left untouched. */
export async function ensureDemoShopper(
  db: Db,
  demo: DemoShopper,
): Promise<{ created: boolean; userId: number }> {
  const existing = db.select({ id: users.id }).from(users).where(eq(users.email, demo.email)).get();
  if (existing) return { created: false, userId: existing.id };

  const account = await signUp(db, {
    email: demo.email,
    password: demo.password,
    displayName: demo.displayName,
  });
  if (!account.ok) throw new Error(`Demo shopper ${demo.email}: ${account.code}`);
  const { userId } = account;

  const credit = topUp(db, userId, { amountInput: demo.creditUsd, card: DEMO_CARD });
  if (!credit.ok) throw new Error(`Demo top-up failed: ${credit.code}`);

  const cartId = getOrCreateCart(db, { cartId: null, userId }).id;
  const added = addItem(db, cartId, demo.pastOrder);
  if (!added.ok) throw new Error(`Demo order item ${demo.pastOrder.slug}: ${added.code}`);
  const order = placeOrder(db, {
    userId,
    cartId: null,
    checkoutToken: randomUUID(),
    expectedTotalUsd: getCartView(db, cartId).subtotalUsd,
    method: "card",
    card: DEMO_CARD,
  });
  if (!order.ok) throw new Error(`Demo order failed: ${order.code}`);

  if (demo.perDiem) {
    const stream = connectStream(db, userId, {
      preset: "per_diem",
      customName: "",
      amountUsd: demo.perDiem.amountUsd,
      schedule: "recurring",
      intervalCount: "1", // a per diem tops off daily
      intervalUnit: "days",
      startsAt: "",
      endsAt: "",
      ongoing: true,
    });
    if (!stream.ok) throw new Error(`Demo per diem failed: ${stream.code}`);
  }

  return { created: true, userId };
}
