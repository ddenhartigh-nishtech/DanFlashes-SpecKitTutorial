import { describe, expect, it } from "vitest";
import { validateFauxCard } from "@/lib/payments/faux-card";

const NOW = new Date("2026-10-13T12:00:00Z");
const card = (number: string, expiry = "12/29", cvc = "123") =>
  validateFauxCard({ number, expiry, cvc }, NOW);

describe("validateFauxCard", () => {
  it("accepts a published test number and returns only brand + last4", () => {
    expect(card("4242 4242 4242 4242")).toEqual({ ok: true, brand: "Visa", last4: "4242" });
  });

  it("strips spaces and dashes", () => {
    expect(card("4242-4242-4242-4242")).toMatchObject({ ok: true, last4: "4242" });
  });

  it.each([
    ["4242424242424241", "a failed Luhn checksum"],
    ["42424242424", "too few digits"],
    ["42424242424242424242", "too many digits"],
    ["4242abcd42424242", "letters"],
    ["", "nothing"],
  ])("rejects %s (%s)", (number) => {
    expect(card(number)).toEqual({ ok: false, code: "CARD_INVALID_NUMBER" });
  });

  it.each([
    ["5555555555554444", "Mastercard"],
    ["2223003122003222", "Mastercard"],
    ["378282246310005", "Amex"],
    ["6011111111111117", "Discover"],
    ["6500000000000002", "Discover"],
    ["3530111333300000", "Card"],
  ])("detects %s as %s", (number, brand) => {
    expect(card(number)).toMatchObject({ ok: true, brand });
  });

  it("treats the current month as valid and last month as expired", () => {
    expect(card("4242424242424242", "10/26")).toMatchObject({ ok: true });
    expect(card("4242424242424242", "09/26")).toEqual({ ok: false, code: "CARD_EXPIRED" });
    expect(card("4242424242424242", "10 / 26")).toMatchObject({ ok: true });
  });

  it.each(["13/29", "00/29", "1/29", "December", ""])("rejects the expiry %j", (expiry) => {
    expect(card("4242424242424242", expiry)).toEqual({ ok: false, code: "CARD_EXPIRED" });
  });

  it.each(["12", "12345", "abc", ""])("rejects the CVC %j", (cvc) => {
    expect(card("4242424242424242", "12/29", cvc)).toEqual({ ok: false, code: "CARD_INVALID_CVC" });
  });

  it("accepts 3- and 4-digit CVCs", () => {
    expect(card("378282246310005", "12/29", "1234")).toMatchObject({ ok: true });
  });
});
