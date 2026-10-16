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
  if (!settings.flashMode) rules.push(`${ON}{animation:none!important}`);
  if (!settings.pipesBackground) {
    rules.push(
      `${ON} body{background-color:var(--df-strobe-paper, var(--color-paper))!important}`,
      `${ON} [data-testid="pipes"]{display:none!important}`,
      `${ON} .field-backing{padding:0!important;border:0!important}`,
    );
  }
  if (!settings.flashMode && !settings.pipesBackground) {
    rules.push(`[data-testid="extreme-awesomeness"]{display:none!important}`);
  }
  return rules.join("\n");
}
