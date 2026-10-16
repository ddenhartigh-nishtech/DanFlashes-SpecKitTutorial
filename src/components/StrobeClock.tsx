"use client";

import { useLayoutEffect } from "react";
import { AWESOME_ATTR } from "@/lib/awesome/choice";
import { nextStep, STROBE_ATTR, STROBE_HOLD_MS } from "@/lib/awesome/strobe";

/**
 * Flash Mode's clock (006 R7): one step every STROBE_HOLD_MS while Extreme Awesomeness is on and the
 * page can be seen. The step is an attribute on <html>, and strobeCss() turns it into colors, so the
 * page restyles 2.5 times a second rather than every frame. The island mounts it only while the
 * owner's Flash Mode switch is on.
 */
export function StrobeClock() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    let timer: ReturnType<typeof setInterval> | undefined;

    const sync = () => {
      clearInterval(timer);
      timer = undefined;
      if (root.getAttribute(AWESOME_ATTR) !== "on") {
        root.removeAttribute(STROBE_ATTR);
        return;
      }
      // Pressing the button starts on the first color at once; the <head> script did so on load.
      if (!root.hasAttribute(STROBE_ATTR)) root.setAttribute(STROBE_ATTR, "0");
      if (document.visibilityState === "hidden") return;
      timer = setInterval(() => {
        const step = Number(root.getAttribute(STROBE_ATTR)) || 0;
        root.setAttribute(STROBE_ATTR, String(nextStep(step)));
      }, STROBE_HOLD_MS);
    };

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: [AWESOME_ATTR] });
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      clearInterval(timer);
    };
  }, []);

  return null;
}
