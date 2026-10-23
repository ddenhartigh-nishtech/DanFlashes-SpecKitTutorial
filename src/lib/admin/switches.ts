/**
 * The switchboard (008 FR-012, R11): the store's 16 switches (the tactics, Flash Mode's two, 007's pattern generator and
 * Uniquity Surcharge, and 012's PSSB), each a boolean in
 * store_settings with the same name. Labels and one-line descriptions live in
 * copy.console.settings.switches.
 */
import type { StoreSettings } from "@/lib/catalog/types";

export const SWITCH_KEYS = [
  "checkoutGate",
  "blandShaming",
  "confirmshaming",
  "perDiemDrain",
  "drainJokes",
  "fakeScarcity",
  "countdownTimers",
  "socialProof",
  "preCheckedAddOns",
  "roachMotel",
  "flashMode",
  "pipesBackground",
  "nosySignUp",
  "patternGenerator",
  "uniquitySurcharge",
  "pushySalesBot",
] as const satisfies readonly (keyof StoreSettings)[];

export type SwitchKey = (typeof SWITCH_KEYS)[number];

export const isSwitchKey = (key: string): key is SwitchKey =>
  (SWITCH_KEYS as readonly string[]).includes(key);
