import { describe, expect, it } from "vitest";
import { copy } from "@/lib/copy";

describe("copy.streams.period", () => {
  it.each([
    [1, "minute"],
    [5, "5 minutes"],
    [90, "90 minutes"],
    [60, "hour"],
    [120, "2 hours"],
    [1440, "day"],
    [2880, "2 days"],
  ])("%i minutes reads as %j", (minutes, words) => {
    expect(copy.streams.period(minutes)).toBe(words);
  });

  it("feeds the every-payday hint", () => {
    expect(copy.streams.hints.recurring(copy.streams.period(5))).toBe(
      "Pays automatically, every 5 minutes.",
    );
  });
});
