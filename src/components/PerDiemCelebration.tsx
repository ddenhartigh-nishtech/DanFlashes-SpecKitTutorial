import Link from "next/link";
import { copy } from "@/lib/copy";

/** The per diem achievement (003 US2): tops the confirmation of the order that drained it. */
export function PerDiemCelebration() {
  return (
    <section
      data-testid="per-diem-achievement"
      className="loud-stripes border-ink animate-pulse border-4 p-4 motion-reduce:animate-none md:p-8"
    >
      <div className="solid-backing p-6 text-center">
        <p className="font-display bg-hot-pink text-paper inline-block px-3 py-1 text-sm">
          🏆 {copy.celebration.badge} 🏆
        </p>
        <h2 className="font-display text-highlighter mt-3 text-3xl leading-tight md:text-5xl">
          {copy.celebration.headline}
        </h2>
        <p className="mt-3 text-lg">{copy.celebration.body}</p>
        <Link
          href="/shirts"
          className="font-display bg-acid text-ink mt-5 inline-flex min-h-11 items-center px-4 uppercase"
        >
          {copy.celebration.cta}
        </Link>
      </div>
    </section>
  );
}
