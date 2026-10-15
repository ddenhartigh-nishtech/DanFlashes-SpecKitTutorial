/** Revenue streams (003): the store's preset sources and the three schedules a stream can pay on. */
export const STREAM_PRESETS = [
  "per_diem",
  "expense_report",
  "college_fund",
  "garage_sale",
  "second_mortgage",
] as const;
export type StreamPreset = (typeof STREAM_PRESETS)[number];

export const STREAM_SCHEDULES = ["recurring", "one_time", "whenever"] as const;
export type StreamSchedule = (typeof STREAM_SCHEDULES)[number];

/** A recurring top-off repeats every N of these (owner, 2026-10-14). Months vary, so they're out. */
export const INTERVAL_UNITS = { minutes: 1, hours: 60, days: 1440, weeks: 10080 } as const;
export type IntervalUnit = keyof typeof INTERVAL_UNITS;
export const MAX_INTERVAL_COUNT = 1000;

export const PER_DIEM: StreamPreset = "per_diem";
export const MAX_CUSTOM_NAME_LENGTH = 40;
/** At most this many missed payments per stream are credited per settlement (spec Assumptions). */
export const CATCH_UP_CAP = 30;
