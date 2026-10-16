import { describe, expect, it } from "vitest";
import { copy } from "@/lib/copy";
import { shouldNudge } from "@/lib/nosy/nudge";

const n = copy.nosy;

describe("the nosy fields (009 R8)", () => {
  it("asks for at least ten things, the roadmap's four among them", () => {
    expect(n.fields.length).toBeGreaterThanOrEqual(10);
    const labels = n.fields.map((f) => f.label.toLowerCase());
    for (const asked of [
      "social security number",
      "mother's maiden name",
      "blood type",
      "current medications",
    ]) {
      expect(labels).toContain(asked);
    }
    for (const field of n.fields) expect(field.label.trim()).not.toBe("");
  });

  it("masks only the Social Security Number and mother's maiden name (FR-006)", () => {
    expect(n.fields.filter((f) => f.masked).map((f) => f.label)).toEqual([
      "Social Security Number",
      "Mother's maiden name",
    ]);
  });

  it("marks each one required, has Dan's line, and the legend (FR-008, FR-009)", () => {
    expect(n.required).toBe("Required");
    expect(n.skipped).toBe("Dan noticed you skipped a few. He'll allow it.");
    expect(n.legend).toBe("** Actually required.");
    expect(n.heading.trim()).not.toBe("");
  });
});

describe("shouldNudge (009 R6)", () => {
  it.each([
    [{ anyBlank: true, nudged: false }, true], // the first press with a blank: Dan's line
    [{ anyBlank: true, nudged: true }, false], // he already said it: let him through
    [{ anyBlank: false, nudged: false }, false], // all filled: straight through
    [{ anyBlank: false, nudged: true }, false],
  ])("%o → %s", (input, expected) => {
    expect(shouldNudge(input)).toBe(expected);
  });
});
