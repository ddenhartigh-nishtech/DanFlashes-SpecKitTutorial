/**
 * Exact money (constitution: "Exact money", research R4).
 *
 * Every amount is a US-dollar string with exactly two decimals, e.g. "200.18" or "-1450.00".
 * All arithmetic goes through big.js; JS numbers are refused so binary-float drift can never
 * reach a price, a total, or a Flash Credit balance.
 */
import Big from "big.js";

Big.RM = Big.roundHalfUp;

/** A two-decimal USD amount, e.g. "200.18". Validated at runtime with {@link isUsdString}. */
export type Usd = string;

export const ZERO: Usd = "0.00";

const USD_RE = /^-?\d+\.\d{2}$/;
const INPUT_RE = /^-?\d+(\.\d{1,2})?$/;
const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

export class MoneyError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

export function isUsdString(value: unknown): value is Usd {
  return typeof value === "string" && USD_RE.test(value);
}

function requireString(value: unknown, what: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${what} must be a money string, got ${typeof value}`);
  }
  return value;
}

function toBig(value: unknown): Big {
  const s = requireString(value, "Amount");
  if (!USD_RE.test(s)) throw new MoneyError(`Not a two-decimal USD amount: ${JSON.stringify(s)}`);
  return new Big(s);
}

function toUsd(value: Big): Usd {
  const fixed = value.round(2, Big.roundHalfUp).toFixed(2);
  return fixed === "-0.00" ? ZERO : fixed;
}

/**
 * Parse user- or config-supplied money ("1450", "0.5", "$1,234.50") into a canonical
 * two-decimal string. Throws on anything with more than two decimals or that isn't a number.
 */
export function parseUsd(input: string): Usd {
  const cleaned = requireString(input, "Input").trim().replace(/[$,]/g, "");
  if (!INPUT_RE.test(cleaned))
    throw new MoneyError(`Not a dollar amount: ${JSON.stringify(input)}`);
  return toUsd(new Big(cleaned));
}

export function tryParseUsd(input: string): Usd | null {
  try {
    return parseUsd(input);
  } catch {
    return null;
  }
}

export function add(a: Usd, b: Usd): Usd {
  return toUsd(toBig(a).plus(toBig(b)));
}

export function sub(a: Usd, b: Usd): Usd {
  return toUsd(toBig(a).minus(toBig(b)));
}

/** Price × quantity. Quantity must be a non-negative integer. */
export function mul(price: Usd, quantity: number): Usd {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new MoneyError(`Quantity must be a non-negative integer, got ${quantity}`);
  }
  return toUsd(toBig(price).times(quantity));
}

export function sum(amounts: readonly Usd[]): Usd {
  return toUsd(amounts.reduce((total, a) => total.plus(toBig(a)), new Big(0)));
}

/** -1, 0, or 1, comparing exactly. */
export function cmp(a: Usd, b: Usd): -1 | 0 | 1 {
  return toBig(a).cmp(toBig(b));
}

/** Round any decimal string (e.g. an intermediate "424.265") half-up to the cent. */
export function roundHalfUp2(value: string): Usd {
  const s = requireString(value, "Value");
  if (!DECIMAL_RE.test(s)) throw new MoneyError(`Not a decimal: ${JSON.stringify(s)}`);
  return toUsd(new Big(s));
}

/**
 * The single sanctioned float bridge, used only by the MSRP algorithm: an exact amount is
 * scaled by a floating-point factor (the exponential) and immediately snapped to exact cents.
 */
export function scaleByFloat(amount: Usd, factor: number): Usd {
  if (typeof factor !== "number" || !Number.isFinite(factor) || factor < 0) {
    throw new MoneyError(`Not a finite, non-negative factor: ${factor}`);
  }
  return toUsd(toBig(amount).times(new Big(factor)));
}

/** "$1,234,567.89" — always in full, never abbreviated or in exponent notation. */
export function formatUsd(value: Usd): string {
  const s = toBig(value).toFixed(2);
  const negative = s.startsWith("-");
  const [whole, cents] = (negative ? s.slice(1) : s).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}.${cents}`;
}

/**
 * How far `value` is from `base`, in percent of `base`, exact and rounded half-up to one decimal
 * ("50.0", "-16.7"). A hair either side of zero reads "0.0", never "-0.0" (008 R12).
 */
export function percentDiff(value: Usd, base: Usd): string {
  const b = toBig(base);
  if (b.eq(0)) throw new MoneyError("A percentage of $0.00 isn't a number.");
  const pct = toBig(value).minus(b).div(b).times(100).round(1, Big.roundHalfUp).toFixed(1);
  return pct === "-0.0" ? "0.0" : pct;
}
