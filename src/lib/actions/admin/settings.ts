/**
 * The switchboard's actions (008 US2): one switch at a time, the MSRP dials, the top-up amounts,
 * and where the pictures come from. Each saves only its own columns (R11), after the door.
 */
import { checkCatalog } from "@/lib/admin/catalog-check";
import { asAdmin, id, problems, refused, saved, text, type ConsoleState } from "@/lib/admin/state";
import { isSwitchKey } from "@/lib/admin/switches";
import type { Issue } from "@/lib/catalog/validate";
import { copy } from "@/lib/copy";
import { getMediaById } from "@/lib/data/media";
import {
  saveMediaSettings,
  savePresets,
  saveSurchargeAmount,
  saveSwitch,
  saveTuning,
} from "@/lib/data/settings";
import type { Db } from "@/lib/db/client";
import type { CookieJar } from "@/lib/http/cookies";
import { cmp, tryParseUsd } from "@/lib/money";

const s = copy.console.settings;

/** A dollar amount of at least $0.01, as dollars and cents, or null. */
function positiveUsd(raw: string): string | null {
  const usd = tryParseUsd(raw.trim());
  return usd !== null && cmp(usd, "0.01") >= 0 ? usd : null;
}

/** FR-013: one switch, one click, nothing else changes. */
export function setSwitchCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const key = text(form, "key");
  const on = text(form, "on");
  if (!isSwitchKey(key) || (on !== "1" && on !== "0")) return refused(s.unknownSwitch);
  saveSwitch(db, key, on === "1");
  return saved(s.switched(s.switches[key].label, on === "1"));
}

/** FR-014, FR-015: new dials, refused if any shirt would break a rule under them. */
export function saveTuningCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const t = s.tuning;
  const issues: Issue[] = [];
  const startPriceUsd = positiveUsd(text(form, "startPriceUsd"));
  if (startPriceUsd === null) issues.push({ field: "startPriceUsd", message: t.startFormat });
  const anchor = text(form, "anchorScore").trim();
  if (!/^\d+$/.test(anchor)) issues.push({ field: "anchorScore", message: t.anchorFormat });
  const interval = text(form, "doublingInterval").trim();
  if (!/^\d+$/.test(interval) || Number(interval) < 1) {
    issues.push({ field: "doublingInterval", message: t.intervalFormat });
  }
  if (issues.length) return problems(issues);

  const msrp = {
    startPriceUsd: startPriceUsd!,
    anchorScore: Number(anchor),
    doublingInterval: Number(interval),
  };
  return db.transaction(() => {
    const broken = checkCatalog(db, { msrp });
    if (broken.length) return refused(t.breaks, broken);
    saveTuning(db, msrp);
    return saved();
  });
}

/** FR-016: the amounts the account page offers, in the order given. */
export function savePresetsCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const p = s.presets;
  const raw = text(form, "presetsUsd")
    .split(/[\s,]+/)
    .filter((v) => v.trim() !== "");
  if (raw.length === 0) return refused(p.none);
  const issues: Issue[] = [];
  const amounts: string[] = [];
  for (const value of raw) {
    const usd = positiveUsd(value);
    if (usd === null) issues.push({ field: "presetsUsd", message: p.format(value) });
    else if (amounts.includes(usd)) issues.push({ field: "presetsUsd", message: p.duplicate(usd) });
    else amounts.push(usd);
  }
  if (issues.length) return problems(issues);
  savePresets(db, amounts);
  return saved();
}

/** 007 FR-027: what the Uniquity Surcharge charges per one-of-a-kind shirt. Zero is allowed. */
export function saveSurchargeCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const raw = text(form, "amountUsd").trim();
  const amountUsd = raw === "" ? null : tryParseUsd(raw);
  if (amountUsd === null || cmp(amountUsd, "0.00") < 0) {
    return problems([{ field: "amountUsd", message: s.surcharge.format }]);
  }
  saveSurchargeAmount(db, amountUsd);
  return saved();
}

/** FR-017: where pictures are served from, and the placeholder (never left unset). */
export function saveMediaSettingsCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const m = s.media;
  const issues: Issue[] = [];
  const mediaBaseUrl = text(form, "mediaBaseUrl").trim();
  if (mediaBaseUrl !== "" && !/^https?:\/\/\S+$/.test(mediaBaseUrl)) {
    issues.push({ field: "mediaBaseUrl", message: m.baseUrlFormat });
  }
  const placeholderMediaId = id(form, "placeholderMediaId");
  if (placeholderMediaId === null || !getMediaById(db, placeholderMediaId)) {
    issues.push({ field: "placeholderMediaId", message: m.placeholderMissing });
  }
  if (issues.length) return problems(issues);
  saveMediaSettings(db, { mediaBaseUrl, placeholderMediaId: placeholderMediaId! });
  return saved();
}
