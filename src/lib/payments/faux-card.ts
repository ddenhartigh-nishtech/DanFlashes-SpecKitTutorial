/**
 * Faux card validation (constitution: "Card numbers are props", research R9). There is no
 * payment processor; a number only has to look like a card. Only the brand and last four digits
 * ever leave this function, and its input is never logged.
 */
import type { Err, Ok } from "@/lib/result";

export interface FauxCardInput {
  number: string;
  expiry: string;
  cvc: string;
}

export type CardErrorCode = "CARD_INVALID_NUMBER" | "CARD_EXPIRED" | "CARD_INVALID_CVC";
export type FauxCardResult = Ok<{ brand: string; last4: string }> | Err<CardErrorCode>;

function luhn(digits: string): boolean {
  let total = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    total += d;
  }
  return total % 10 === 0;
}

function brandOf(digits: string): string {
  if (/^4/.test(digits)) return "Visa";
  const firstFour = Number(digits.slice(0, 4));
  if (/^5[1-5]/.test(digits) || (firstFour >= 2221 && firstFour <= 2720)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^(6011|65)/.test(digits)) return "Discover";
  return "Card";
}

/** A card is valid through the last day of its expiry month. */
function notExpired(expiry: string, now: Date): boolean {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(expiry.trim());
  if (!match) return false;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return false;
  const year = 2000 + Number(match[2]);
  return year * 12 + month >= now.getUTCFullYear() * 12 + (now.getUTCMonth() + 1);
}

export function validateFauxCard(input: FauxCardInput, now: Date = new Date()): FauxCardResult {
  const digits = input.number.replace(/[\s-]/g, "");
  if (!/^\d{12,19}$/.test(digits) || !luhn(digits))
    return { ok: false, code: "CARD_INVALID_NUMBER" };
  if (!notExpired(input.expiry, now)) return { ok: false, code: "CARD_EXPIRED" };
  if (!/^\d{3,4}$/.test(input.cvc.trim())) return { ok: false, code: "CARD_INVALID_CVC" };
  return { ok: true, brand: brandOf(digits), last4: digits.slice(-4) };
}
