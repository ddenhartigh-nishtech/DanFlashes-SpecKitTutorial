import { describe, expect, it } from "vitest";
import {
  AWESOME_KEY,
  applyChoice,
  firstPaintScript,
  parseChoice,
  readChoice,
  serializeChoice,
  writeChoice,
} from "@/lib/awesome/choice";

/** A stand-in for <html>: just the attribute calls the script and helpers make. */
function fakeRoot() {
  const attrs = new Map<string, string>();
  return {
    attrs,
    setAttribute: (name: string, value: string) => void attrs.set(name, value),
    removeAttribute: (name: string) => void attrs.delete(name),
  };
}

function fakeStorage(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

const throwing = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

/** Run the inline script the way the browser does: against a document and a localStorage. */
function runScript(storage: unknown) {
  const root = fakeRoot();
  const document = { documentElement: root };
  new Function("document", "localStorage", firstPaintScript())(document, storage);
  return root.attrs;
}

describe("the stored choice (006 R2)", () => {
  it("lives under df-awesome", () => {
    expect(AWESOME_KEY).toBe("df-awesome");
  });

  it.each([
    ["1", true],
    ["0", false],
    ["on", false],
    ["", false],
    [null, false],
    [undefined, false],
  ] as const)("parses %o as %s", (value, on) => {
    expect(parseChoice(value)).toBe(on);
  });

  it("serializes on and off", () => {
    expect(serializeChoice(true)).toBe("1");
    expect(serializeChoice(false)).toBe("0");
  });

  it("reads and writes through storage, and never throws when storage is missing or refuses", () => {
    const storage = fakeStorage();
    expect(readChoice(storage)).toBe(false);
    writeChoice(storage, true);
    expect(storage.map.get(AWESOME_KEY)).toBe("1");
    expect(readChoice(storage)).toBe(true);
    writeChoice(storage, false);
    expect(readChoice(storage)).toBe(false);
    expect(readChoice(undefined)).toBe(false);
    expect(readChoice(throwing)).toBe(false);
    expect(() => writeChoice(throwing, true)).not.toThrow();
    expect(() => writeChoice(undefined, true)).not.toThrow();
  });

  it("applies the choice to the root as data-awesome", () => {
    const root = fakeRoot();
    applyChoice(root, true);
    expect(root.attrs.get("data-awesome")).toBe("on");
    applyChoice(root, false);
    expect(root.attrs.has("data-awesome")).toBe(false);
  });
});

describe("the first-paint script (006 R3)", () => {
  it("turns it on before first paint only when the browser has it on", () => {
    const on = runScript(fakeStorage({ [AWESOME_KEY]: "1" }));
    expect(on.get("data-awesome")).toBe("on");
    expect(on.get("data-strobe-step")).toBe("0"); // the strobe's first color, from the first frame
    expect(runScript(fakeStorage({ [AWESOME_KEY]: "0" })).has("data-strobe-step")).toBe(false);
    expect(runScript(fakeStorage({ [AWESOME_KEY]: "0" })).has("data-awesome")).toBe(false);
    expect(runScript(fakeStorage({ other: "1" })).has("data-awesome")).toBe(false);
  });

  it("never throws: no storage, or storage that refuses", () => {
    expect(runScript(undefined).has("data-awesome")).toBe(false);
    expect(runScript(throwing).has("data-awesome")).toBe(false);
  });
});
