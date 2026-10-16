"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import {
  applyChoice,
  AWESOME_ATTR,
  AWESOME_KEY,
  parseChoice,
  readChoice,
  writeChoice,
} from "@/lib/awesome/choice";
import { copy } from "@/lib/copy";

const a = copy.awesome;

/** Some private modes throw on touching localStorage at all. */
function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

// The attribute on <html> is the truth: the inline <head> script sets it before first paint, and
// pressing the button sets it at once (006 R3, R5). The button just reflects it.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [AWESOME_ATTR] });
  return () => observer.disconnect();
}
const isOn = () => document.documentElement.getAttribute(AWESOME_ATTR) === "on";
const serverOff = () => false;

/**
 * Extreme Awesomeness (006 US1): the most exciting button on the site. It turns on whatever the
 * owner has on (the strobe, the pipes), at once and with no page load, and his browser remembers it.
 */
export function ExtremeAwesomeness({ className = "" }: { className?: string }) {
  const on = useSyncExternalStore(subscribe, isOn, serverOff);

  useLayoutEffect(() => {
    const root = document.documentElement;
    // React's dev remount resets <html> to the attributes it manages: put his choice back.
    applyChoice(root, readChoice(storage()));
    // His other open tabs follow along (FR-009).
    const follow = (event: StorageEvent) => {
      if (event.key === AWESOME_KEY) applyChoice(root, parseChoice(event.newValue));
    };
    window.addEventListener("storage", follow);
    return () => window.removeEventListener("storage", follow);
  }, []);

  const press = () => {
    applyChoice(document.documentElement, !on);
    writeChoice(storage(), !on);
  };

  return (
    <button
      type="button"
      aria-pressed={on}
      data-testid="extreme-awesomeness"
      data-steady
      onClick={press}
      className={`df-awesome-button font-display min-h-11 rounded-sm p-1 uppercase ${className}`}
    >
      <span className="bg-ink text-paper flex min-h-9 items-center justify-center gap-2 rounded-sm px-3 text-sm leading-tight">
        <span>{a.label}</span>
        <span className="df-awesome-off bg-paper text-ink rounded-sm px-1.5 text-xs">{a.off}</span>
        <span className="df-awesome-on bg-highlighter text-ink rounded-sm px-1.5 text-xs">
          {a.on}
        </span>
      </span>
    </button>
  );
}
