import { describe, expect, it } from "vitest";
import { REDACTED, redact } from "@/lib/pssb/redact";

describe("redact (012 FR-016, R7)", () => {
  it.each([
    "4242424242424242",
    "4242 4242 4242 4242",
    "4242-4242-4242-4242",
    "5555 5555 5555 4444",
    "378282246310005", // 15-digit Amex test number
  ])("blanks the card-shaped number %s", (card) => {
    expect(redact(`my card is ${card} ok`)).toBe(`my card is ${REDACTED} ok`);
  });

  it("keeps digit runs that fail the card check, prices and order numbers", () => {
    expect(redact("4242424242424241")).toBe("4242424242424241");
    expect(redact("Is Fractal Fury $1,350.00? Order DF-000012, 2 shirts.")).toBe(
      "Is Fractal Fury $1,350.00? Order DF-000012, 2 shirts.",
    );
  });

  it.each(["123-45-6789", "123456789"])("blanks the SSN-shaped %s", (ssn) => {
    expect(redact(`ssn ${ssn}.`)).toBe(`ssn ${REDACTED}.`);
  });

  it("blanks several in one message", () => {
    expect(redact("4242 4242 4242 4242 and 123-45-6789")).toBe(`${REDACTED} and ${REDACTED}`);
  });
});
