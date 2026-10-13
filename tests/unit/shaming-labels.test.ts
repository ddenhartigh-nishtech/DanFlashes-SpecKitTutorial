import { describe, expect, it } from "vitest";
import { labelFor } from "@/lib/shaming/labels";

describe("labelFor", () => {
  it.each([
    ["insist", "Yes, I'd rather blend in", "Yes, I'm sure"],
    ["remove", "Remove (and lose your edge)", "Remove"],
    ["signOut", "Sign out (go back to being normal)", "Sign out"],
  ] as const)("%s: shamed when confirmshaming is on, neutral when off", (key, shamed, neutral) => {
    expect(labelFor(key, true)).toBe(shamed);
    expect(labelFor(key, false)).toBe(neutral);
  });
});
