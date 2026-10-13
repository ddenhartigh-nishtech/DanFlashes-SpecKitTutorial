import { currentCartId } from "@/app/_data/request";
import { itemCount } from "@/lib/cart/cart";
import { getDb } from "@/lib/db/client";

/** The header's live cart count. Request-time: render inside <Suspense>. */
export async function CartCount() {
  const count = itemCount(getDb(), await currentCartId());
  if (count === 0) return null;
  return (
    <span
      data-testid="cart-count"
      className="bg-hot-pink text-paper ml-1 inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-xs"
    >
      {count}
    </span>
  );
}
