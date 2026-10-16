"use client";

/**
 * A script that runs while the HTML parses, before first paint (Next's "preventing flash before
 * hydration" guide). On the client it renders as inert text, so React doesn't warn about rendering
 * a script; suppressHydrationWarning covers the type difference.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
