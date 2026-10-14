"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const utcFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/**
 * An ISO-8601 time in the shopper's own time zone (003 R7). The server can't know his zone, so it
 * renders UTC; the browser swaps in local time right after hydration, with no mismatch and no effect.
 */
export function LocalTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
    () => `${utcFormat.format(new Date(iso))} UTC`,
  );
  return <time dateTime={iso}>{text}</time>;
}
