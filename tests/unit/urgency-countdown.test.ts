import { describe, expect, it } from "vitest";
import { COUNTDOWN_MS, formatCountdown, remainingMs, showCountdown } from "@/lib/urgency/countdown";

const ANCHOR = Date.parse("2026-10-15T12:00:00.000Z");

describe("remainingMs", () => {
  it("counts down 10 minutes from the anchor, then quietly starts over", () => {
    expect(COUNTDOWN_MS).toBe(600_000);
    expect(remainingMs(ANCHOR, ANCHOR)).toBe(600_000);
    expect(remainingMs(ANCHOR + 1, ANCHOR)).toBe(599_999);
    expect(remainingMs(ANCHOR + 599_999, ANCHOR)).toBe(1);
    expect(remainingMs(ANCHOR + 600_000, ANCHOR)).toBe(600_000); // back to full: never "expired"
    expect(remainingMs(ANCHOR + 600_001, ANCHOR)).toBe(599_999);
    expect(remainingMs(ANCHOR + 7 * 600_000 + 250, ANCHOR)).toBe(599_750);
  });

  it("stays within (0, 10:00] for any time, even a clock that runs behind the anchor", () => {
    for (const offset of [-1, -599_999, -600_000, -1_234_567, 0, 42, 9_999_999]) {
      const left = remainingMs(ANCHOR + offset, ANCHOR);
      expect(left).toBeGreaterThan(0);
      expect(left).toBeLessThanOrEqual(600_000);
    }
  });
});

describe("formatCountdown", () => {
  it.each([
    [600_000, "10:00.000"],
    [599_999, "09:59.999"],
    [61_001, "01:01.001"],
    [59_999, "00:59.999"],
    [1, "00:00.001"],
    [0, "00:00.000"],
    [-5, "00:00.000"], // never negative
  ])("%i ms → %s", (ms, text) => {
    expect(formatCountdown(ms)).toBe(text);
  });

  it("never shows 60 seconds or a ragged width", () => {
    for (let ms = 0; ms <= 600_000; ms += 997) {
      const text = formatCountdown(ms);
      expect(text).toMatch(/^\d{2}:[0-5]\d\.\d{3}$/);
    }
  });
});

describe("showCountdown", () => {
  const on = { countdownTimers: true };
  const off = { countdownTimers: false };
  it("shows the deal whenever it's on, and the hold only for a cart with lines", () => {
    expect(showCountdown(on, "deal", 0)).toBe(true);
    expect(showCountdown(on, "hold", 2)).toBe(true);
    expect(showCountdown(on, "hold", 0)).toBe(false);
    expect(showCountdown(off, "deal", 0)).toBe(false);
    expect(showCountdown(off, "hold", 3)).toBe(false);
  });
});
