import { copy } from "@/lib/copy";

export type LabelKey = keyof typeof copy.shame.labels;

/** The decline label for a choice: shaming while confirmshaming is on, neutral while it is off. */
export function labelFor(key: LabelKey, confirmshaming: boolean): string {
  const label = copy.shame.labels[key];
  return confirmshaming ? label.shamed : label.neutral;
}
