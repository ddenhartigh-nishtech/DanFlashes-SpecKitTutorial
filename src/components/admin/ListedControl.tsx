"use client";

import { setShirtListed } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import { copy } from "@/lib/copy";

const g = copy.console.generator;

/**
 * A shopper-made shirt is one of a kind until Dan lists it in the store (007 FR-018, FR-021). Only
 * the editor of a dial shirt shows this.
 */
export function ListedControl({ shirtId, listed }: { shirtId: number; listed: boolean }) {
  const { state, onSubmit, pending } = useConsoleAction(setShirtListed);
  return (
    <div className={`${ui.card} flex flex-col gap-3`}>
      <p className="text-sm">
        <span className="text-office-muted">{g.listedTitle}: </span>
        <span data-testid="shirt-listed" className="font-medium">
          {listed ? g.listed : g.oneOfAKind}
        </span>
      </p>
      <form onSubmit={onSubmit}>
        <input type="hidden" name="id" value={shirtId} />
        <input type="hidden" name="listed" value={listed ? "0" : "1"} />
        <button type="submit" disabled={pending} className={listed ? ui.button : ui.primary}>
          {listed ? g.unlist : g.list}
        </button>
      </form>
      <ConsoleMessage state={state} />
    </div>
  );
}
