import { describe, expect, it } from "vitest";
import { validateConnectInput, type ConnectInput } from "@/lib/streams/validate";

const NOW = new Date("2026-10-14T12:00:00.000Z");
const iso = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString();
const base: ConnectInput = {
  preset: "per_diem",
  customName: "",
  amountUsd: "75.00",
  schedule: "recurring",
  intervalCount: "5",
  intervalUnit: "minutes",
  startsAt: "",
  endsAt: "",
  ongoing: true,
};
const code = (patch: Partial<ConnectInput>) => {
  const result = validateConnectInput({ ...base, ...patch }, NOW);
  return result.ok ? "ok" : result.code;
};

describe("validateConnectInput — the name", () => {
  it("takes a preset, or a trimmed custom name of 1–40 characters", () => {
    expect(validateConnectInput(base, NOW)).toMatchObject({
      ok: true,
      value: { preset: "per_diem", customName: null },
    });
    expect(
      validateConnectInput({ ...base, preset: "custom", customName: "  Craig owes me  " }, NOW),
    ).toMatchObject({ ok: true, value: { preset: null, customName: "Craig owes me" } });
    expect(code({ preset: "custom", customName: "x".repeat(40) })).toBe("ok");
  });

  it.each([
    ["an unknown preset", { preset: "lottery" }],
    ["an empty custom name", { preset: "custom", customName: "   " }],
    ["a 41-character name", { preset: "custom", customName: "x".repeat(41) }],
  ])("refuses %s", (_, patch) => {
    expect(code(patch)).toBe("INVALID_STREAM_NAME");
  });
});

describe("validateConnectInput — the amount", () => {
  it("normalizes dollars and cents from $0.01 up, with no ceiling (the sky is the limit)", () => {
    expect(validateConnectInput({ ...base, amountUsd: "75" }, NOW)).toMatchObject({
      value: { amountUsd: "75.00" },
    });
    expect(code({ amountUsd: "10000.01" })).toBe("ok");
    expect(
      validateConnectInput({ ...base, amountUsd: "$1,000,000,000,000.99" }, NOW),
    ).toMatchObject({
      value: { amountUsd: "1000000000000.99" },
    });
    expect(code({ amountUsd: "0.01" })).toBe("ok");
  });

  it.each(["0.00", "0.001", "1.234", "abc", "", "-5.00"])("refuses %j", (amountUsd) => {
    expect(code({ amountUsd })).toBe("INVALID_STREAM_AMOUNT");
  });
});

describe("validateConnectInput — a recurring top-off's interval", () => {
  it.each([
    ["5", "minutes", 5],
    ["3", "hours", 180],
    ["1", "days", 1440],
    ["2", "weeks", 20160],
  ])("every %s %s is %i minutes", (intervalCount, intervalUnit, minutes) => {
    expect(validateConnectInput({ ...base, intervalCount, intervalUnit }, NOW)).toMatchObject({
      ok: true,
      value: { intervalMinutes: minutes },
    });
  });

  it.each([
    ["0", "minutes"],
    ["1.5", "days"],
    ["", "days"],
    ["abc", "hours"],
    ["1001", "minutes"],
    ["1", "months"],
  ])("refuses every %j %j", (intervalCount, intervalUnit) => {
    expect(code({ intervalCount, intervalUnit })).toBe("INVALID_INTERVAL");
  });

  it("has no interval for the other schedules", () => {
    for (const schedule of ["one_time", "whenever"]) {
      expect(
        validateConnectInput({ ...base, schedule, intervalCount: "", intervalUnit: "" }, NOW),
      ).toMatchObject({ ok: true, value: { intervalMinutes: null } });
    }
  });
});

describe("validateConnectInput — the schedule and the window", () => {
  it("starts now when no start is given, and clamps a start a few seconds back to now", () => {
    expect(validateConnectInput(base, NOW)).toMatchObject({
      value: { startsAt: NOW.toISOString(), endsAt: null },
    });
    const skewed = new Date(NOW.getTime() - 30_000).toISOString();
    expect(validateConnectInput({ ...base, startsAt: skewed }, NOW)).toMatchObject({
      value: { startsAt: NOW.toISOString() },
    });
  });

  it("keeps a later start and an end after it", () => {
    expect(
      validateConnectInput({ ...base, startsAt: iso(60), endsAt: iso(120), ongoing: false }, NOW),
    ).toMatchObject({ value: { startsAt: iso(60), endsAt: iso(120) } });
  });

  it("applies a one-time stream right now, ignoring any start or end", () => {
    expect(
      validateConnectInput(
        { ...base, schedule: "one_time", startsAt: iso(60), ongoing: false, endsAt: "" },
        NOW,
      ),
    ).toMatchObject({
      ok: true,
      value: { schedule: "one_time", startsAt: NOW.toISOString(), endsAt: null },
    });
  });

  it.each([
    ["a start in the past", { startsAt: iso(-5) }],
    ["an unreadable start", { startsAt: "next tuesday" }],
    ["an end before the start", { ongoing: false, endsAt: iso(-1) }],
    ["an end equal to the start", { ongoing: false, startsAt: iso(30), endsAt: iso(30) }],
    ["neither an end nor ongoing", { ongoing: false, endsAt: "" }],
    ["an unknown schedule", { schedule: "hourly" }],
  ])("refuses %s", (_, patch) => {
    expect(code(patch)).toBe("INVALID_WINDOW");
  });
});
