import Link from "next/link";
import { loadPerDiemMeter } from "@/app/_data/streams";
import { copy } from "@/lib/copy";
import { formatUsd } from "@/lib/money";

/**
 * The per diem gauge (003 US2, R6): fixed to the bottom-left corner of every page, so it streams in
 * without moving anything. Only for a signed-in shopper with a per diem while the drain is on.
 */
export async function PerDiemMeter() {
  const meter = await loadPerDiemMeter();
  if (!meter) return null;
  return (
    <Link
      href="/account#revenue-streams"
      data-testid="per-diem-meter"
      className={`border-ink fixed bottom-3 left-3 z-30 flex max-w-[calc(100vw-1.5rem)] flex-col border-4 px-3 py-2 shadow-[4px_4px_0_var(--color-ink)] ${
        meter.drained ? "loud-stripes" : "bg-highlighter"
      }`}
    >
      {meter.drained ? (
        <span className="solid-backing font-display px-2 py-1 text-sm uppercase">
          🏆 {copy.meter.drained}
          <span className="text-highlighter block text-xs">{copy.meter.drainedTag}</span>
        </span>
      ) : (
        <>
          <span className="font-display text-xs uppercase">{copy.meter.label}</span>
          <span className="font-display text-lg [overflow-wrap:anywhere] tabular-nums">
            {formatUsd(meter.leftUsd)}
          </span>
        </>
      )}
    </Link>
  );
}
