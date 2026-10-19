import type { ReactNode } from "react";
import { Poster } from "@/components/admin/Poster";
import { ui } from "@/components/admin/ui";
import { copy } from "@/lib/copy";

/** Every console page: a title, an optional line under it, today's poster, then the work. */
export function ConsolePage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <title>{`${title} · ${copy.console.brand}`}</title>
      <div className="grid gap-4 md:grid-cols-[1fr_18rem] md:items-start">
        <div className="flex flex-col gap-2">
          <h1 className={ui.h1}>{title}</h1>
          {intro ? <div className={ui.muted}>{intro}</div> : null}
        </div>
        <Poster />
      </div>
      {children}
    </div>
  );
}

/** What a console page shows while it reads: quiet words, nothing that moves. */
export function ConsoleLoading() {
  return <p className={ui.muted}>{copy.console.working}</p>;
}
