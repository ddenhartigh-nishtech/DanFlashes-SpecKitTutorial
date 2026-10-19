import { LocalTime } from "@/components/LocalTime";
import { ui } from "@/components/admin/ui";
import { copy } from "@/lib/copy";
import type { LedgerEntry } from "@/lib/flash-credit/ledger";
import { formatUsd } from "@/lib/money";
import { orderNumber } from "@/lib/orders/orders";

const e = copy.console.customers.entry;

function describe(entry: LedgerEntry): string {
  switch (entry.kind) {
    case "top_up":
      return e.top_up(entry.cardBrand ?? "Card", entry.cardLast4 ?? "????");
    case "spend":
      return e.spend(orderNumber(entry.orderId ?? 0));
    case "stream":
      return e.stream(entry.streamName ?? "");
    case "grant":
      return e.grant;
  }
}

/** A customer's Flash Credit history, newest first (008 FR-033): every entry, as recorded. */
export function LedgerTable({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) {
    return <p className={ui.muted}>{copy.console.customers.noEntries}</p>;
  }
  return (
    <ul className="divide-office-line divide-y text-sm">
      {entries.map((entry) => (
        <li
          key={entry.id}
          data-testid="ledger-entry"
          className="flex flex-wrap items-baseline justify-between gap-2 py-2"
        >
          <span className="flex flex-col">
            <span>{describe(entry)}</span>
            <span className={ui.muted}>
              <LocalTime iso={entry.createdAt} />
            </span>
          </span>
          <span className="tabular-nums">
            {entry.kind === "spend" ? "" : "+"}
            {formatUsd(entry.amountUsd)}
          </span>
        </li>
      ))}
    </ul>
  );
}
