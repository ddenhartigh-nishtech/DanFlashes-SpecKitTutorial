import { describe, expect, it } from "vitest";
import { copy } from "@/lib/copy";
import { nextDelay, pickPop, popDue, POP_SHOW_MS, scheduleNext } from "@/lib/urgency/pops";

const NOW = Date.parse("2026-10-15T12:00:00.000Z");

describe("nextDelay / scheduleNext", () => {
  it("waits 20–40 seconds between pop-ups", () => {
    for (const rand of [0, 0.25, 0.5, 0.999999]) {
      const delay = nextDelay(rand);
      expect(delay).toBeGreaterThanOrEqual(20_000);
      expect(delay).toBeLessThanOrEqual(40_000);
    }
    expect(nextDelay(0)).toBe(20_000);
  });

  it("after a pop-up ends or is closed, the next one is still coming", () => {
    const nextAt = scheduleNext(NOW, 0.5);
    expect(nextAt - NOW).toBeGreaterThanOrEqual(20_000);
    expect(nextAt - NOW).toBeLessThanOrEqual(40_000);
    expect(popDue({ now: NOW, nextAt, visible: true })).toBe(false);
    expect(popDue({ now: nextAt, nextAt, visible: true })).toBe(true);
  });

  it("shows each pop-up for about 6 seconds", () => {
    expect(POP_SHOW_MS).toBe(6_000);
  });
});

describe("popDue", () => {
  it("waits while the tab is hidden, then shows one once it's overdue and visible", () => {
    expect(popDue({ now: NOW, nextAt: NOW - 90_000, visible: false })).toBe(false);
    expect(popDue({ now: NOW, nextAt: NOW - 90_000, visible: true })).toBe(true);
    expect(popDue({ now: NOW, nextAt: NOW + 1, visible: true })).toBe(false);
  });
});

describe("pickPop", () => {
  const candidates = [
    { name: "Geo Riot", slug: "geo-riot" },
    { name: "Fractal Fury", slug: "fractal-fury" },
  ];
  const cast = copy.urgency.cast;

  it("names one of the candidates and one of the cast", () => {
    for (const [a, b] of [
      [0, 0],
      [0.5, 0.5],
      [0.999999, 0.999999],
    ]) {
      const pop = pickPop(candidates, cast, a, b)!;
      expect(candidates).toContainEqual(pop.shirt);
      expect(cast).toContainEqual(pop.coworker);
    }
  });

  it("has nothing to say with no candidates", () => {
    expect(pickPop([], cast, 0.3, 0.3)).toBeNull();
  });
});
