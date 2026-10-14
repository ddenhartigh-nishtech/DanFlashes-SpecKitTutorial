/**
 * Bland-shirt shaming (002 US1): the endless "You sure about that?" loop. Pure and browser-safe;
 * the ladder it climbs is built on the server (`ladder.ts`).
 */
import type { ShopperShirt } from "@/lib/data/shirts";
import { labelFor } from "@/lib/shaming/labels";

/** Rounds count from 1: round 1 offers the bottom rung, each round climbs one, the top rung holds. */
export function recommendationFor(
  round: number,
  ladder: readonly ShopperShirt[],
): ShopperShirt | null {
  if (ladder.length === 0) return null;
  return ladder[Math.min(Math.max(round, 1), ladder.length) - 1];
}

/**
 * A shuffled pass through the line pool (Fisher–Yates). A new pass never opens with the line that
 * was just shown, so lines don't repeat until the whole pool has been used, even across passes.
 */
export function lineOrder(
  poolSize: number,
  random: () => number,
  previous: number | null,
): number[] {
  const order = Array.from({ length: poolSize }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (order.length > 1 && order[0] === previous) {
    [order[0], order[order.length - 1]] = [order[order.length - 1], order[0]];
  }
  return order;
}

export interface ShameFlags {
  isBland: boolean;
  blandShaming: boolean;
  confirmshaming: boolean;
}

export interface Shame {
  ladder: ShopperShirt[];
  insistLabel: string;
}

/** What Add to Cart needs to run the loop, or null when the shirt adds normally. */
export function shameFor(flags: ShameFlags, ladder: ShopperShirt[]): Shame | null {
  if (!flags.isBland || !flags.blandShaming) return null;
  return { ladder, insistLabel: labelFor("insist", flags.confirmshaming) };
}
