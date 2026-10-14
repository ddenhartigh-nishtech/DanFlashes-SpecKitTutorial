import { describe, expect, it } from "vitest";
import { crossedToZero, perDiemLeft, type PerDiemEvent } from "@/lib/streams/meter";

const payday = (at: string, amountUsd: string): PerDiemEvent => ({ at, kind: "payday", amountUsd });
const order = (at: string, amountUsd: string): PerDiemEvent => ({ at, kind: "order", amountUsd });

describe("perDiemLeft", () => {
  it("is what the per diem paid in minus what he spent, to the cent", () => {
    expect(
      perDiemLeft([
        payday("t1", "75.00"),
        payday("t2", "75.00"),
        payday("t3", "75.00"),
        order("t4", "100.10"),
        order("t5", "24.95"),
      ]),
    ).toBe("99.95");
    expect(perDiemLeft([payday("t1", "0.10"), payday("t2", "0.20")])).toBe("0.30"); // exact
  });

  it("never goes below $0.00, however much he overspends", () => {
    expect(perDiemLeft([payday("t1", "75.00"), order("t2", "344.61")])).toBe("0.00");
    expect(perDiemLeft([order("t1", "1.00")])).toBe("0.00");
    expect(perDiemLeft([])).toBe("0.00");
  });

  it("refills by the whole top-off: spending past $0 isn't held against the next one", () => {
    expect(
      perDiemLeft([
        payday("t1", "500.00"),
        order("t2", "424.26"),
        order("t3", "424.26"), // drains it
        order("t4", "424.26"), // at $0: other money, not the per diem
        payday("t5", "500.00"),
      ]),
    ).toBe("500.00");
  });

  it("replays in time order, and a top-off lands before an order at the same instant", () => {
    expect(perDiemLeft([order("t2", "50.00"), payday("t1", "75.00")])).toBe("25.00");
    expect(perDiemLeft([order("t1", "50.00"), payday("t1", "75.00")])).toBe("25.00");
  });
});

describe("crossedToZero", () => {
  it.each([
    ["155.39", "0.00", true], // the drain
    ["0.01", "0.00", true],
    ["500.00", "155.39", false], // still some left
    ["0.00", "0.00", false], // already drained: no second party for the same drain
  ] as const)("%s → %s is %s", (before, after, crossed) => {
    expect(crossedToZero(before, after)).toBe(crossed);
  });
});
