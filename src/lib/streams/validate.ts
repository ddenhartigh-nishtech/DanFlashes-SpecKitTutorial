/**
 * Validating a new revenue stream (003 FR-001–FR-005). Pure: the form's strings in, a normalized
 * stream (exact money, ISO-8601 UTC window) or one error code out.
 */
import { cmp, tryParseUsd, type Usd } from "@/lib/money";
import type { Err, Ok } from "@/lib/result";
import {
  INTERVAL_UNITS,
  MAX_CUSTOM_NAME_LENGTH,
  MAX_INTERVAL_COUNT,
  STREAM_PRESETS,
  STREAM_SCHEDULES,
  type StreamPreset,
  type StreamSchedule,
} from "@/lib/streams/types";

/** What the connect form sends. `preset` is a preset key, or "custom" for a named stream. */
export interface ConnectInput {
  preset: string;
  customName: string;
  amountUsd: string;
  schedule: string;
  /** A recurring top-off repeats every `intervalCount` `intervalUnit`s; ignored otherwise. */
  intervalCount: string;
  intervalUnit: string;
  /** ISO-8601; empty means "now". Ignored for one-time streams, which apply right away. */
  startsAt: string;
  /** ISO-8601; ignored when `ongoing`, and for one-time streams. */
  endsAt: string;
  ongoing: boolean;
}

export interface ValidStream {
  preset: StreamPreset | null;
  customName: string | null;
  amountUsd: Usd;
  schedule: StreamSchedule;
  /** Only for recurring top-offs. */
  intervalMinutes: number | null;
  startsAt: string;
  endsAt: string | null;
}

export type ConnectError =
  "INVALID_STREAM_NAME" | "INVALID_STREAM_AMOUNT" | "INVALID_INTERVAL" | "INVALID_WINDOW";

/** A start this far in the past counts as "now" (clock skew between browser and server). */
const START_SKEW_MS = 60_000;

const isPreset = (value: string): value is StreamPreset =>
  (STREAM_PRESETS as readonly string[]).includes(value);
const isSchedule = (value: string): value is StreamSchedule =>
  (STREAM_SCHEDULES as readonly string[]).includes(value);

function parseTime(value: string): number | null {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

export function validateConnectInput(
  input: ConnectInput,
  now: Date,
): Ok<{ value: ValidStream }> | Err<ConnectError> {
  let preset: StreamPreset | null = null;
  let customName: string | null = null;
  if (isPreset(input.preset)) {
    preset = input.preset;
  } else if (input.preset === "custom") {
    const name = input.customName.trim();
    if (name.length < 1 || name.length > MAX_CUSTOM_NAME_LENGTH) {
      return { ok: false, code: "INVALID_STREAM_NAME" };
    }
    customName = name;
  } else {
    return { ok: false, code: "INVALID_STREAM_NAME" };
  }

  const amountUsd = tryParseUsd(input.amountUsd);
  // No ceiling: the sky is the limit (owner, 2026-10-14).
  if (amountUsd === null || cmp(amountUsd, "0.01") < 0) {
    return { ok: false, code: "INVALID_STREAM_AMOUNT" };
  }

  if (!isSchedule(input.schedule)) return { ok: false, code: "INVALID_WINDOW" };
  const schedule = input.schedule;

  let intervalMinutes: number | null = null;
  if (schedule === "recurring") {
    const count = input.intervalCount.trim() ? Number(input.intervalCount) : NaN;
    const unit = INTERVAL_UNITS[input.intervalUnit as keyof typeof INTERVAL_UNITS];
    if (!unit || !Number.isInteger(count) || count < 1 || count > MAX_INTERVAL_COUNT) {
      return { ok: false, code: "INVALID_INTERVAL" };
    }
    intervalMinutes = count * unit;
  }

  const nowMs = now.getTime();
  let startMs = nowMs;
  // A one-time stream is applied right now: no start, no end.
  if (schedule !== "one_time" && input.startsAt.trim()) {
    const parsed = parseTime(input.startsAt);
    if (parsed === null || parsed < nowMs - START_SKEW_MS)
      return { ok: false, code: "INVALID_WINDOW" };
    startMs = Math.max(parsed, nowMs);
  }

  let endsAt: string | null = null;
  if (schedule !== "one_time" && !input.ongoing) {
    const endMs = parseTime(input.endsAt);
    if (endMs === null || endMs <= startMs) return { ok: false, code: "INVALID_WINDOW" };
    endsAt = new Date(endMs).toISOString();
  }

  return {
    ok: true,
    value: {
      preset,
      customName,
      amountUsd,
      schedule,
      intervalMinutes,
      startsAt: new Date(startMs).toISOString(),
      endsAt,
    },
  };
}
