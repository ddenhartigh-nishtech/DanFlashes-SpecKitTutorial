import { describe, expect, it } from "vitest";
import { needsConfirm } from "@/lib/cart/roach-motel";

describe("needsConfirm", () => {
  it("asks before every decrease: a remove, or a lower quantity", () => {
    expect(needsConfirm({ kind: "remove" }, true)).toBe(true);
    expect(needsConfirm({ kind: "update", current: 3, next: 2 }, true)).toBe(true);
    expect(needsConfirm({ kind: "update", current: 99, next: 1 }, true)).toBe(true);
  });

  it("never asks to go up or stay put: shirts check in freely", () => {
    expect(needsConfirm({ kind: "update", current: 2, next: 3 }, true)).toBe(false);
    expect(needsConfirm({ kind: "update", current: 2, next: 2 }, true)).toBe(false);
  });

  it("never asks with the switch off", () => {
    expect(needsConfirm({ kind: "remove" }, false)).toBe(false);
    expect(needsConfirm({ kind: "update", current: 3, next: 2 }, false)).toBe(false);
  });
});
