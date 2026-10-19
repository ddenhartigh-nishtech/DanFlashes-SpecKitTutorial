/**
 * Fabricated social proof on the shirt page (004 US3, R5). Pure and deterministic: the same shirt
 * says the same thing to everyone at the same moment, and it drifts slowly, so a reload a minute
 * later moves the crowd a little. Nobody here is real: names come from the fake cast in copy.
 */
import type { StoreSettings } from "@/lib/catalog/types";
import { copy } from "@/lib/copy";

export type Coworker = (typeof copy.urgency.cast)[number];

const MINUTE = 60_000;
const DRIFT_PERIOD = 20 * MINUTE;
const DRIFT_AMPLITUDE = 6; // a ±6 swing over 20 minutes moves ≤ 2 people a minute
const BUYER_WINDOW = 10 * MINUTE;

/** A small, stable integer hash (Knuth's multiplicative), so each shirt has its own crowd. */
const hash = (n: number) => Math.imul(n, 2654435761) >>> 0;

/** "N people are looking at this shirt right now": 3–40, never 0, drifting over time. */
export function lookingNow(shirtId: number, now: number): number {
  const base = 3 + (hash(shirtId) % 38); // 3–40
  const phase = (hash(shirtId + 1) % 1000) / 1000;
  const drift = DRIFT_AMPLITUDE * Math.sin(2 * Math.PI * (now / DRIFT_PERIOD + phase));
  return Math.min(40, Math.max(3, Math.round(base + drift)));
}

/** Who "just bought this pattern": a coworker from the cast, holding still for 10 minutes. */
export function buyerFor(shirtId: number, now: number): Coworker {
  const window = Math.floor(now / BUYER_WINDOW);
  const cast = copy.urgency.cast;
  return cast[hash(shirtId * 31 + window) % cast.length];
}

export interface SocialProof {
  looking: number;
  buyer: Coworker | null;
}

/**
 * What the shirt page says, or null when it says nothing: switch off, retired, or one of a kind (007
 * FR-026), since nobody else is looking at his shirt and nobody else bought it.
 */
export function socialProofFor(
  settings: Pick<StoreSettings, "socialProof">,
  shirt: { id: number; isBland: boolean; active: boolean; oneOfAKind?: boolean },
  now: number,
): SocialProof | null {
  if (!settings.socialProof || !shirt.active || shirt.oneOfAKind) return null;
  if (shirt.isBland) return { looking: 0, buyer: null };
  return { looking: lookingNow(shirt.id, now), buyer: buyerFor(shirt.id, now) };
}
