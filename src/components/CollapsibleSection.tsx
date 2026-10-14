import type { ReactNode } from "react";

/**
 * A section that opens and closes at its header: native <details>, open by default, so it works
 * without JavaScript and keeps keyboard and screen-reader behavior for free. The indicator flips
 * with the open state.
 */
export function CollapsibleSection({
  id,
  heading,
  className,
  children,
}: {
  id: string;
  heading: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details id={id} open className="group scroll-mt-24">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <h2 className="font-display text-2xl md:text-3xl">{heading}</h2>
        <span
          data-testid="section-indicator"
          aria-hidden
          className="font-display bg-ink text-highlighter flex size-10 shrink-0 items-center justify-center text-lg transition-transform group-open:rotate-180"
        >
          ▼
        </span>
      </summary>
      <div className={className}>{children}</div>
    </details>
  );
}
