import { fieldStrobeCss, STROBE_EXCLUDE } from "@/lib/awesome/strobe";
import type { StoreSettings } from "@/lib/catalog/types";

const ON = ':root[data-awesome="on"]';

/**
 * The owner's switches as CSS (006 R4). The layout island streams this with the page while a switch
 * is off, so the feature he turned off is undone as soon as that part of the page arrives, before
 * any script runs. It's empty while both are on.
 */
export function switchOffCss(
  settings: Pick<StoreSettings, "flashMode" | "pipesBackground">,
): string {
  const rules: string[] = [];
  if (!settings.flashMode) {
    // The <head> script still sets the first step: hold what the strobe would recolor at its normal
    // color. Only that: a picked size keeps its own black (STROBE_EXCLUDE).
    rules.push(
      `${ON} :is(.bg-paper,.field-backing)${STROBE_EXCLUDE}{background-color:var(--color-paper)!important}`,
      `${ON} .solid-backing${STROBE_EXCLUDE}{background-color:var(--color-ink)!important}`,
      `${ON} :is(.border-ink,.field-backing)${STROBE_EXCLUDE}{border-color:var(--color-ink)!important}`,
    );
  }
  if (!settings.pipesBackground) {
    // The plain field comes back, and strobes too while Flash Mode is on.
    rules.push(
      settings.flashMode
        ? fieldStrobeCss()
        : `${ON} body{background-color:var(--color-paper)!important}`,
      `${ON} [data-testid="pipes"]{display:none!important}`,
      `${ON} .field-backing{padding:0!important;border:0!important}`,
    );
  }
  if (!settings.flashMode && !settings.pipesBackground) {
    rules.push(`[data-testid="extreme-awesomeness"]{display:none!important}`);
  }
  return rules.join("\n");
}
