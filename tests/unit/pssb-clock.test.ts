import { describe, expect, it } from "vitest";
import { APPROACH_EVERY_MS, approachDue, type Blockers } from "@/lib/pssb/clock";

const clear: Blockers = { typing: false, streaming: false, dialogOpen: false, hidden: false };
const T0 = 1_000_000;

describe("approachDue (012 FR-012, FR-013, R9)", () => {
  it("comes due 2 minutes after PSSB's last approach or reply", () => {
    expect(APPROACH_EVERY_MS).toBe(120_000);
    expect(approachDue(T0 + 119_999, T0, clear)).toBe(false);
    expect(approachDue(T0 + 120_000, T0, clear)).toBe(true);
  });

  it("starts the clock on the first visit instead of approaching at once", () => {
    expect(approachDue(T0, null, clear)).toBe(false);
  });

  it.each([["typing"], ["streaming"], ["dialogOpen"], ["hidden"]] as const)(
    "holds while %s, and goes once it's clear",
    (blocker) => {
      expect(approachDue(T0 + 200_000, T0, { ...clear, [blocker]: true })).toBe(false);
      expect(approachDue(T0 + 200_000, T0, clear)).toBe(true);
    },
  );

  it("lets a second tab see the first tab's claim", () => {
    // Tab A claims at T0 + 120 s by writing the time; tab B, checking a moment later, reads it.
    expect(approachDue(T0 + 125_000, T0 + 120_000, clear)).toBe(false);
  });
});
