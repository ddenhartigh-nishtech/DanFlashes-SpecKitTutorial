/**
 * One of a kind (007 FR-018, research R14): a shirt a shopper made at the dial, until Dan puts it
 * into mass production. It's made to order for its maker, who can buy as many as he likes, and
 * nobody else can buy it at all. Pure, so the cart, checkout and the shirt page all ask the same
 * question.
 */
import type { ShirtOrigin } from "@/lib/catalog/types";

export interface MadeToOrderFacts {
  origin: ShirtOrigin;
  listed: boolean;
  makerUserId: number | null;
}

export const isOneOfAKind = (shirt: Pick<MadeToOrderFacts, "origin" | "listed">): boolean =>
  shirt.origin === "dial" && !shirt.listed;

/** Whether this account (null: a guest) may put the shirt in a cart and buy it. */
export const canBuy = (shirt: MadeToOrderFacts, userId: number | null): boolean =>
  !isOneOfAKind(shirt) || (userId !== null && shirt.makerUserId === userId);
