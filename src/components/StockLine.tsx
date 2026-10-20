import { copy } from "@/lib/copy";
import type { StockLine as Line } from "@/lib/urgency/scarcity";

const u = copy.urgency;
const text: Record<Line, string> = {
  scarce: u.scarce,
  again: u.again,
  few: u.fewMore,
  plenty: u.plenty,
  made: u.made,
  madeMany: u.madeMany,
};

/** Fake scarcity (004 US1): "Only 1 left!", or its variants. Renders nothing when it's off. */
export function StockLine({ line }: { line: Line | null }) {
  if (!line) return null;
  const loud =
    line === "plenty" ? "bg-paper text-ink border-ink border-2" : "bg-safety-orange text-ink";
  return (
    <p
      data-testid="stock-line"
      className={`font-display inline-block px-2 py-0.5 text-sm [overflow-wrap:anywhere] uppercase ${loud}`}
    >
      {text[line]}
    </p>
  );
}
