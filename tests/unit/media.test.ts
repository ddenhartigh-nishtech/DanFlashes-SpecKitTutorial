import { describe, expect, it } from "vitest";
import { isValidMediaKey, resolveMediaUrl } from "@/lib/media";

describe("resolveMediaUrl", () => {
  it("serves from this site's /media when the base URL is empty", () => {
    expect(resolveMediaUrl("shirts/a.svg", "")).toBe("/media/shirts/a.svg");
  });

  it("joins a remote base URL without doubling slashes", () => {
    expect(resolveMediaUrl("shirts/a.svg", "https://cdn.example.com/df/")).toBe(
      "https://cdn.example.com/df/shirts/a.svg",
    );
    expect(resolveMediaUrl("shirts/a.svg", "https://cdn.example.com/df")).toBe(
      "https://cdn.example.com/df/shirts/a.svg",
    );
  });

  it("refuses an invalid key", () => {
    expect(() => resolveMediaUrl("../secrets.txt", "")).toThrow();
  });
});

describe("isValidMediaKey", () => {
  it.each(["shirts/a.svg", "placeholder.svg", "shirts/tc-tugger_v2.png"])("accepts %s", (key) => {
    expect(isValidMediaKey(key)).toBe(true);
  });

  it.each([
    "",
    "/shirts/a.svg",
    "shirts/../a.svg",
    "..",
    "C:/dev/a.svg",
    "c:\\dev\\a.svg",
    "shirts\\a.svg",
    "https://evil.example/a.svg",
    "shirts/a b.svg",
  ])("rejects %j", (key) => {
    expect(isValidMediaKey(key)).toBe(false);
  });
});
