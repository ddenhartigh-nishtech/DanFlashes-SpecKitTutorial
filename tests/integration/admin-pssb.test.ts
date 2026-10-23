import { describe, expect, it, vi } from "vitest";
import { savePssbCore, saveSupportEmailCore, testPssbCore } from "@/lib/actions/admin/pssb";
import { copy } from "@/lib/copy";
import { getSettings } from "@/lib/data/settings";
import type { Sqlite } from "@/lib/db/client";
import { form } from "../helpers/cookies";
import { createSeededTestDb } from "../helpers/db";
import { person } from "../helpers/people";

const t = copy.console.settings.pssb;

function setup() {
  const test = createSeededTestDb();
  return { ...test, jar: person(test.db, { admin: true }).jar };
}

/** Every settings column except these, to prove an action saves only its own. */
const rest = (sqlite: Sqlite, ...except: string[]) => {
  const row = sqlite.prepare("SELECT * FROM store_settings").get() as Record<string, unknown>;
  return Object.fromEntries(Object.entries(row).filter(([k]) => !except.includes(k)));
};

describe("savePssb (012 FR-019, R10)", () => {
  it("saves only the model's address and name, and blank clears them", () => {
    const { db, sqlite, jar } = setup();
    const others = rest(sqlite, "pssb_model_url", "pssb_model");
    expect(
      savePssbCore(db, jar, form({ modelUrl: " http://192.168.1.102:11434 ", model: "qwen2.5:7b" }))
        .ok,
    ).toBe(true);
    expect(getSettings(db)).toMatchObject({
      pssbModelUrl: "http://192.168.1.102:11434",
      pssbModel: "qwen2.5:7b",
    });
    expect(rest(sqlite, "pssb_model_url", "pssb_model")).toEqual(others);
    expect(savePssbCore(db, jar, form({ modelUrl: "", model: "  " })).ok).toBe(true);
    expect(getSettings(db)).toMatchObject({ pssbModelUrl: null, pssbModel: null });
  });

  it.each([
    [{ modelUrl: "ftp://ollama", model: "" }, "modelUrl", t.urlFormat],
    [{ modelUrl: `http://${"x".repeat(200)}`, model: "" }, "modelUrl", t.urlFormat],
    [{ modelUrl: "", model: "bad name!" }, "model", t.modelFormat],
    [{ modelUrl: "", model: "m".repeat(81) }, "model", t.modelFormat],
  ])("refuses %j, with the refusal staying, and saves nothing", (fields, field, message) => {
    const { db, jar } = setup();
    const before = getSettings(db);
    const state = savePssbCore(db, jar, form(fields));
    expect(state).toEqual({
      ok: false,
      message: copy.console.refused.problems,
      issues: [{ field, message }],
    });
    expect(getSettings(db)).toEqual(before);
  });
});

describe("saveSupportEmail (012 FR-019, FR-020)", () => {
  it("saves, and blank clears it", () => {
    const { db, sqlite, jar } = setup();
    const others = rest(sqlite, "support_email");
    expect(
      saveSupportEmailCore(db, jar, form({ supportEmail: " complaints@danflashes.local " })).ok,
    ).toBe(true);
    expect(getSettings(db).supportEmail).toBe("complaints@danflashes.local");
    expect(rest(sqlite, "support_email")).toEqual(others);
    expect(saveSupportEmailCore(db, jar, form({ supportEmail: "" })).ok).toBe(true);
    expect(getSettings(db).supportEmail).toBeNull();
  });

  it.each([["dan"], ["dan@"], ["dan@flashes"], [`${"d".repeat(120)}@x.io`]])(
    "refuses %j and saves nothing",
    (supportEmail) => {
      const { db, jar } = setup();
      expect(saveSupportEmailCore(db, jar, form({ supportEmail }))).toEqual({
        ok: false,
        message: copy.console.refused.problems,
        issues: [{ field: "supportEmail", message: t.emailFormat }],
      });
      expect(getSettings(db).supportEmail).toBeNull();
    },
  );
});

describe("testPssb (012 FR-019, R10)", () => {
  const answering = (words: string[]) =>
    vi.fn(async () => {
      const lines = [
        ...words.map((w) => ({ message: { content: w }, done: false })),
        { done: true },
      ];
      return new Response(lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
    }) as unknown as typeof fetch;

  it("reports, calmly, that PSSB answered and how long it took", async () => {
    const { db, jar } = setup();
    const state = await testPssbCore(db, jar, form({}), {
      fetchImpl: answering(["Buy ", "a shirt, peasant."]),
      env: {},
    });
    expect(state.ok).toBe(true);
    expect(state.message).toMatch(/^PSSB answered in \d+\.\d s: "Buy a shirt, peasant\."$/);
  });

  it("says plainly when nothing answers, naming the address", async () => {
    const { db, jar } = setup();
    const refusedFetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const state = await testPssbCore(db, jar, form({}), {
      fetchImpl: refusedFetch,
      env: { PSSB_MODEL_URL: "http://nowhere.test:11434" },
    });
    expect(state.ok).toBe(false);
    expect(state.message).toMatch(/^No answer from http:\/\/nowhere\.test:11434: /);
  });
});
