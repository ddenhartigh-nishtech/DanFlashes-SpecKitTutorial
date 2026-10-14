import Link from "next/link";
import { copy } from "@/lib/copy";
import type { DrainedStream } from "@/lib/orders/orders";

const a = copy.achievements;

/**
 * Drain them all (003 US2, US4): every stream the order ran dry is its own achievement, stacked at
 * the top of its confirmation, per diem first. Renders nothing when the order drained nothing.
 */
export function Achievements({ perDiem, streams }: { perDiem: boolean; streams: DrainedStream[] }) {
  const unlocked = [
    ...(perDiem
      ? [{ key: "per-diem", name: copy.streams.presets.per_diem, line: a.lines.per_diem }]
      : []),
    ...streams.map((s) => ({
      key: String(s.streamId),
      name: s.name,
      line: s.preset ? a.lines[s.preset] : a.custom(s.name),
    })),
  ];
  if (unlocked.length === 0) return null;
  return (
    <section data-testid="achievements" className="loud-stripes border-ink border-4 p-4 md:p-8">
      <div className="solid-backing p-6 text-center">
        <p className="font-display bg-hot-pink text-paper inline-block animate-bounce px-3 py-1 text-sm motion-reduce:animate-none">
          🏆 {a.unlocked(unlocked.length)} 🏆
        </p>
        <ul className="mt-4 flex flex-col gap-4">
          {unlocked.map((item) => (
            <li
              key={item.key}
              data-testid="achievement"
              className="border-highlighter border-4 p-4"
            >
              <p className="font-display bg-acid text-ink inline-block px-2 py-1 text-sm [overflow-wrap:anywhere] uppercase">
                {a.gone(item.name)}
              </p>
              <h2 className="font-display text-highlighter mt-3 text-2xl leading-tight [overflow-wrap:anywhere] md:text-4xl">
                {item.line}
              </h2>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-lg">{a.body}</p>
        <Link
          href="/shirts"
          className="font-display bg-acid text-ink mt-5 inline-flex min-h-11 items-center px-4 uppercase"
        >
          {a.cta}
        </Link>
      </div>
    </section>
  );
}
