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

export const PER_DIEM: StreamPreset = "per_diem";
export const MAX_CUSTOM_NAME_LENGTH = 40;
/** At most this many missed payments per stream are credited per settlement (spec Assumptions). */
export const CATCH_UP_CAP = 30;
