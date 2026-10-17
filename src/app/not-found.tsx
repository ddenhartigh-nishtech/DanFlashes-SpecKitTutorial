import Link from "next/link";
import { StoreChrome } from "@/components/StoreChrome";
import { copy } from "@/lib/copy";

/**
 * The store's ordinary 404, in the store's chrome (008 R1): for unknown URLs, missing shirts and
 * orders, and every console address a non-admin opens (R2). It sits above the (store) layout, so
 * it brings the chrome itself.
 */
export default function NotFound() {
  return (
    <StoreChrome>
      <section className="loud-dots border-ink rounded-sm border-4 p-6 md:p-12">
        <div className="solid-backing max-w-xl p-6">
          <p className="font-display text-highlighter text-6xl">404</p>
          <h1 className="font-display mt-2 text-2xl md:text-3xl">{copy.errors.notFoundTitle}</h1>
          <p className="mt-3">{copy.errors.notFoundBody}</p>
          <Link
            href="/shirts"
            className="font-display bg-hot-pink text-paper mt-5 inline-flex min-h-11 items-center px-4 uppercase"
          >
            {copy.errors.notFoundCta}
          </Link>
        </div>
      </section>
    </StoreChrome>
  );
}
