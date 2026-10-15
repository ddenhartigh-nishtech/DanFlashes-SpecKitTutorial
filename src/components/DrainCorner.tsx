import Link from "next/link";
import { dismissDrain } from "@/actions/streams";
import { loadDrainCorner } from "@/app/_data/streams";
import { copy } from "@/lib/copy";
import { formatUsd, type Usd } from "@/lib/money";

/**
 * The bottom-left corner of every page (003 US2, US4, R6, R13): the per diem gauge at the bottom and
 * a GONE pop above it for every other stream that ran dry. It's fixed, so it streams in without
 * moving anything. Every GONE has an (x); the countdown doesn't. Signed-in shoppers, drain on.
 */
export async function DrainCorner() {
  const corner = await loadDrainCorner();
  if (!corner) return null;
  const { jokes, meter, pops } = corner;
  const a = copy.achievements;
  const gauge = meter && !meter.dismissed ? meter : null;
  if (!gauge && pops.length === 0) return null;
  return (
    <div
      data-testid="drain-corner"
      className="fixed bottom-3 left-3 z-30 flex max-w-[calc(100vw-1.5rem)] flex-col-reverse items-start gap-4"
    >
      {gauge?.drained ? (
        <Gone
          testId="per-diem-meter"
          streamId={gauge.streamId}
          paymentNo={gauge.paymentNo}
          trophy={copy.meter.drained}
          joke={jokes ? a.lines.per_diem : null}
        />
      ) : gauge ? (
        <Countdown leftUsd={gauge.leftUsd} />
      ) : null}
      {pops.map((pop) => (
        <Gone
          key={pop.streamId}
          testId="drain-pop"
          streamId={pop.streamId}
          paymentNo={pop.paymentNo}
          trophy={a.gone(pop.name)}
          joke={jokes ? (pop.preset ? a.lines[pop.preset] : a.custom(pop.name)) : null}
        />
      ))}
    </div>
  );
}

const box = "border-ink max-w-full border-4 px-3 py-2 shadow-[4px_4px_0_var(--color-ink)]";

function Countdown({ leftUsd }: { leftUsd: Usd }) {
  return (
    <Link
      href="/account#revenue-streams"
      data-testid="per-diem-meter"
      className={`${box} bg-highlighter flex flex-col`}
    >
      <span className="font-display text-xs uppercase">{copy.meter.label}</span>
      <span className="font-display text-lg [overflow-wrap:anywhere] tabular-nums">
        {formatUsd(leftUsd)}
      </span>
    </Link>
  );
}

/**
 * A trophy in the corner, with an (x) that clears this drain for his account (R13). With the jokes
 * on it also says what he did, wrapped at 20rem so it never stretches across the page (round 6).
 */
function Gone({
  testId,
  streamId,
  paymentNo,
  trophy,
  joke,
}: {
  testId: string;
  streamId: number;
  paymentNo: number;
  trophy: string;
  joke: string | null;
}) {
  return (
    <div data-testid={testId} className={`${box} loud-stripes relative ${joke ? "w-80" : ""}`}>
      <Link
        href="/account#revenue-streams"
        className="solid-backing font-display block px-2 py-1 pr-5 text-sm [overflow-wrap:anywhere] uppercase"
      >
        🏆 {trophy}
        {joke ? (
          <span className="block py-0.5 font-sans text-sm font-bold normal-case">{joke}</span>
        ) : null}
        <span className="text-highlighter block text-xs">{copy.meter.drainedTag}</span>
      </Link>
      <form action={dismissDrain} className="absolute -top-3 -right-3">
        <input type="hidden" name="streamId" value={streamId} />
        <input type="hidden" name="paymentNo" value={paymentNo} />
        <button
          type="submit"
          aria-label={copy.meter.dismiss(trophy)}
          title={copy.meter.dismiss(trophy)}
          className="bg-hot-pink text-paper border-ink font-display flex size-8 items-center justify-center rounded-full border-4 text-xs leading-none"
        >
          ✕
        </button>
      </form>
    </div>
  );
}
