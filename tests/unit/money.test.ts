import { describe, expect, it } from "vitest";
import {
  add,
  cmp,
  formatUsd,
  isUsdString,
  mul,
  parseUsd,
  percentDiff,
  roundHalfUp2,
  sub,
  sum,
  tryParseUsd,
  scaleByFloat,
} from "@/lib/money";

describe("isUsdString", () => {
  it.each(["0.00", "200.18", "-1450.00", "123456789012345678.90"])("accepts %s", (v) => {
    expect(isUsdString(v)).toBe(true);
  });

  it.each(["200.1", "200", "200.180", ".50", "1,000.00", "$5.00", "", " 1.00", "NaN"])(
    "rejects %j",
    (v) => {
      expect(isUsdString(v)).toBe(false);
    },
  );

  it("rejects non-strings", () => {
    expect(isUsdString(200.18)).toBe(false);
    expect(isUsdString(null)).toBe(false);
  });
});

describe("parseUsd", () => {
  it.each([
    ["200.18", "200.18"],
    ["1450", "1450.00"],
    ["0.5", "0.50"],
    ["  42.10 ", "42.10"],
    ["$1,234.50", "1234.50"],
    ["-3", "-3.00"],
  ])("normalizes %j to %s", (input, expected) => {
    expect(parseUsd(input)).toBe(expected);
  });

  it.each(["1.005", "abc", "", "NaN", "1e5", "12.3.4", "--1"])("rejects %j", (input) => {
    expect(() => parseUsd(input)).toThrow();
    expect(tryParseUsd(input)).toBeNull();
  });

  it("refuses JS numbers (constitution: no float money)", () => {
    // @ts-expect-error -- deliberately passing a number
    expect(() => parseUsd(19.99)).toThrow(TypeError);
  });
});

describe("exact arithmetic", () => {
  it("adds without float drift", () => {
    expect(add("0.10", "0.20")).toBe("0.30");
  });

  it("subtracts, allowing negatives", () => {
    expect(sub("100.00", "0.01")).toBe("99.99");
    expect(sub("5.00", "7.25")).toBe("-2.25");
  });

  it("multiplies a price by an integer quantity", () => {
    expect(mul("424.26", 3)).toBe("1272.78");
    expect(mul("0.10", 0)).toBe("0.00");
  });

  it("rejects non-integer or negative quantities", () => {
    expect(() => mul("1.00", 1.5)).toThrow();
    expect(() => mul("1.00", -1)).toThrow();
  });

  it("sums a list exactly, and an empty list is zero", () => {
    expect(sum(["0.10", "0.20", "0.30", "0.40"])).toBe("1.00");
    expect(sum([])).toBe("0.00");
  });

  it("compares exactly", () => {
    expect(cmp("10.00", "9.99")).toBe(1);
    expect(cmp("9.99", "10.00")).toBe(-1);
    expect(cmp("3.00", "3.00")).toBe(0);
    expect(cmp("100000000000000000000.01", "100000000000000000000.00")).toBe(1);
  });

  it("refuses JS numbers in arithmetic", () => {
    // @ts-expect-error -- deliberately passing a number
    expect(() => add(0.1, "0.20")).toThrow(TypeError);
  });
});

describe("rounding", () => {
  it("rounds half-up to the cent", () => {
    expect(roundHalfUp2("424.264")).toBe("424.26");
    expect(roundHalfUp2("424.265")).toBe("424.27");
    expect(roundHalfUp2("0.005")).toBe("0.01");
  });

  it("scales an exact amount by a float factor (MSRP only), snapping to cents", () => {
    expect(scaleByFloat("300.00", Math.SQRT2)).toBe("424.26");
    expect(scaleByFloat("300.00", 1)).toBe("300.00");
    expect(scaleByFloat("1.50", 1e21)).toBe("1500000000000000000000.00");
  });

  it("rejects non-finite or negative factors", () => {
    expect(() => scaleByFloat("1.00", Number.POSITIVE_INFINITY)).toThrow();
    expect(() => scaleByFloat("1.00", Number.NaN)).toThrow();
    expect(() => scaleByFloat("1.00", -2)).toThrow();
  });
});

describe("formatUsd", () => {
  it.each([
    ["0.00", "$0.00"],
    ["5.00", "$5.00"],
    ["1234567.89", "$1,234,567.89"],
    ["-1450.00", "-$1,450.00"],
  ])("formats %s as %s", (v, expected) => {
    expect(formatUsd(v)).toBe(expected);
  });

  it("formats huge values in full, never abbreviated or in exponent notation", () => {
    expect(formatUsd("12345678901234567890.12")).toBe("$12,345,678,901,234,567,890.12");
  });

  it("rejects malformed input", () => {
    expect(() => formatUsd("12.3")).toThrow();
  });
});

describe("percentDiff (008 R12)", () => {
  it.each([
    ["450.00", "300.00", "50.0"],
    ["200.00", "300.00", "-33.3"],
    ["1.00", "3.00", "-66.7"], // half-up, away from zero
    ["300.15", "300.00", "0.1"], // exactly 0.05%: rounds up
    ["299.99", "300.00", "0.0"], // a hair under shows as 0.0, never -0.0
    ["300.00", "300.00", "0.0"],
  ])("%s against %s is %s%", (value, base, expected) => {
    expect(percentDiff(value, base)).toBe(expected);
  });

  it("refuses a zero base and anything that isn't money", () => {
    expect(() => percentDiff("1.00", "0.00")).toThrow();
    expect(() => percentDiff("1", "3.00")).toThrow();
  });
});
