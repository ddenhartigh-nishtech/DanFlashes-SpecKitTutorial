import { disconnectStream } from "@/actions/streams";
import { CashInButton } from "@/components/CashInButton";
import { LocalTime } from "@/components/LocalTime";
import { copy } from "@/lib/copy";
import { formatUsd } from "@/lib/money";
import { labelFor } from "@/lib/shaming/labels";
import type { StreamView } from "@/lib/streams/streams";

const s = copy.streams;

/** His revenue streams (003 FR-008): what each pays, when, and what happens next. */
export function StreamList({
  streams,
  confirmshaming,
}: {
  streams: StreamView[];
  confirmshaming: boolean;
}) {
  if (streams.length === 0) return <p className="solid-backing p-3">{s.empty}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {streams.map((stream) => (
        <li
          key={stream.id}
          data-testid="stream"
          className={`border-ink bg-paper flex flex-col gap-2 border-4 p-3 shadow-[4px_4px_0_var(--color-ink)] ${stream.connected ? "" : "opacity-60"}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-display text-lg leading-tight">{stream.name}</span>
            <span className="font-display tabular-nums">+{formatUsd(stream.amountUsd)}</span>
          </div>
          <p className="text-sm font-semibold uppercase">{s.schedules[stream.schedule]}</p>
          {stream.schedule === "one_time" ? null : (
            <p className="text-sm">
              {s.windowFrom} <LocalTime iso={stream.startsAt} />{" "}
              {stream.endsAt ? (
                <>
                  {s.windowUntil} <LocalTime iso={stream.endsAt} />
                </>
              ) : (
                s.windowForever
              )}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Status stream={stream} />
            {stream.connected ? (
              <form action={disconnectStream}>
                <input type="hidden" name="streamId" value={stream.id} />
                <button
                  type="submit"
                  className="font-display min-h-11 px-2 text-sm uppercase underline decoration-4 underline-offset-4"
                >
                  {labelFor("disconnect", confirmshaming)}
                </button>
              </form>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Status({ stream }: { stream: StreamView }) {
  const badge = "font-display bg-ink text-paper px-2 py-1 text-sm uppercase";
  if (!stream.connected) return <span className={badge}>{s.disconnectedBadge}</span>;
  if (stream.done) return <span className={badge}>{s.done}</span>;
  if (stream.ended) return <span className={badge}>{s.endedBadge}</span>;
  if (stream.cashable) {
    return <CashInButton streamId={stream.id} paymentNo={stream.nextPaymentNo} />;
  }
  if (stream.schedule === "whenever") {
    return (
      <span className="text-sm font-semibold">
        {s.startsLater} <LocalTime iso={stream.startsAt} />
      </span>
    );
  }
  return stream.nextDueAt ? (
    <span className="text-sm font-semibold">
      {s.nextPayment}: <LocalTime iso={stream.nextDueAt} />
    </span>
  ) : null;
}
