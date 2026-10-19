import type { Usd } from "@/lib/money";

export type ShirtStyle = "polo" | "button-down";
export type ShirtStatus = "active" | "inactive";
/** Hand-made, from Dan's generator, or from a shopper's dial (007). */
export type ShirtOrigin = "catalog" | "owner" | "dial";

export const SHIRT_STYLES: readonly ShirtStyle[] = ["polo", "button-down"];
export const SHIRT_STATUSES: readonly ShirtStatus[] = ["active", "inactive"];
export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

export interface MsrpSettings {
  startPriceUsd: Usd;
  anchorScore: number;
  doublingInterval: number;
}

export interface StoreSettings {
  msrp: MsrpSettings;
  checkoutGate: boolean;
  flashCreditPresetsUsd: Usd[];
  mediaBaseUrl: string;
  placeholderMediaId: number | null;
  /** Bland-shirt shaming (constitution IV): the endless "You sure about that?" loop. */
  blandShaming: boolean;
  /** Confirmshaming (constitution IV): decline buttons that make him feel it. */
  confirmshaming: boolean;
  /** The per diem drain (constitution IV): the per diem gauge and its $0 celebration. */
  perDiemDrain: boolean;
  /** Each GONE in the corner also says what he did (003 round 6). Only matters with the drain on. */
  drainJokes: boolean;
  /** Fake scarcity (constitution IV): "Only 1 left!", and "found another one" on every add. */
  fakeScarcity: boolean;
  /** Countdown timers that reset (constitution IV): the shared deal and hold clock. */
  countdownTimers: boolean;
  /** Fabricated social proof (constitution IV): "looking right now", the buyer, the pop-ups. */
  socialProof: boolean;
  /** Pre-checked add-ons (constitution IV): checkout arrives with every extra already ticked. */
  preCheckedAddOns: boolean;
  /** Roach-motel cart (constitution IV): any decrease asks "Are you sure?", then "sure sure?". */
  roachMotel: boolean;
  /** Flash Mode (constitution V): the strobe that Extreme Awesomeness turns on. */
  flashMode: boolean;
  /** The Pipes Background (006): the screensaver behind every page while Extreme Awesomeness is on. */
  pipesBackground: boolean;
  /** The nosy sign-up (009): sign-up asks for far too much. The answers are props, never sent. */
  nosySignUp: boolean;
  /** The pattern generator (007): the store's "How complicated can it get?" dial. */
  patternGenerator: boolean;
  /** The Uniquity Surcharge™ (007 R15): a flat fee on every one-of-a-kind shirt, per shirt. */
  uniquitySurcharge: boolean;
  /** What it charges per shirt: dollars and cents, $0.00 or more. */
  uniquitySurchargeUsd: string;
}

/** An owner-defined band of complexity scores. The tier with minScore 0 is the BLAND tier. */
export interface Tier {
  id: number;
  name: string;
  tagline: string | null;
  minScore: number;
  badgeBgColor: string;
  badgeTextColor: string;
}

/** Owner-side shirt fields relevant to pricing and validation. */
export interface PricedShirtInput {
  complexity: number;
  finalPriceUsd: Usd | null;
}
