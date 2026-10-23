/**
 * Personal numbers never reach the model (012 FR-016, R7; constitution: card numbers and nosy data
 * are props). Card-shaped digit runs that pass the Luhn check, and SSN shapes, are blanked out of
 * what a shopper types before the store sends it anywhere.
 */
export const REDACTED = "[redacted]";

/** 13–19 digits, each pair optionally separated by one space or dash. */
const CARD = /\b\d(?:[ -]?\d){12,18}\b/g;
/** 123-45-6789, or nine digits in a row. */
const SSN = /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g;

function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function redact(text: string): string {
  return text
    .replace(CARD, (match) => (passesLuhn(match.replace(/\D/g, "")) ? REDACTED : match))
    .replace(SSN, REDACTED);
}
