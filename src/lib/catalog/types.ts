import type { Usd } from "@/lib/money";

export type ShirtStyle = "polo" | "button-down";
export type ShirtStatus = "active" | "inactive";

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
