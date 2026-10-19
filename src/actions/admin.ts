"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { cookieJar } from "@/app/_data/request";
import {
  attachImageCore,
  createShirtCore,
  detachImageCore,
  moveImageCore,
  setShirtStatusCore,
  updateShirtCore,
} from "@/lib/actions/admin/shirts";
import {
  saveMediaSettingsCore,
  savePresetsCore,
  saveTuningCore,
  setSwitchCore,
} from "@/lib/actions/admin/settings";
import { removeMediaCore, updateMediaAltCore, uploadMediaCore } from "@/lib/actions/admin/media";
import {
  createAddOnCore,
  moveAddOnCore,
  setAddOnActiveCore,
  updateAddOnCore,
} from "@/lib/actions/admin/add-ons";
import { saveTiersCore } from "@/lib/actions/admin/tiers";
import { grantFlashCreditCore } from "@/lib/actions/admin/grants";
import { saveGeneratedShirtCore, setShirtListedCore } from "@/lib/actions/admin/generator";
import type { ConsoleState } from "@/lib/admin/state";
import { getDb } from "@/lib/db/client";
import type { CookieJar } from "@/lib/http/cookies";

/**
 * The console's Server Actions (008 contracts/console.md): thin wrappers. Every rule, the admin
 * check first, lives in the framework-free cores in src/lib/actions/admin.
 */
type Core = (
  db: ReturnType<typeof getDb>,
  jar: CookieJar,
  form: FormData,
) => ConsoleState | Promise<ConsoleState>;

async function run(core: Core, form: FormData): Promise<ConsoleState> {
  const state = await core(getDb(), await cookieJar(), form);
  if (state.ok) refresh();
  return state;
}

export async function createShirt(_prev: ConsoleState | null, form: FormData) {
  const state = createShirtCore(getDb(), await cookieJar(), form);
  if (state.ok && state.id) redirect(`/admin/shirts/${state.id}?saved=1`);
  return state;
}

export async function updateShirt(_prev: ConsoleState | null, form: FormData) {
  return run(updateShirtCore, form);
}
export async function setShirtStatus(_prev: ConsoleState | null, form: FormData) {
  return run(setShirtStatusCore, form);
}
export async function attachImage(_prev: ConsoleState | null, form: FormData) {
  return run(attachImageCore, form);
}
export async function moveImage(_prev: ConsoleState | null, form: FormData) {
  return run(moveImageCore, form);
}
export async function detachImage(_prev: ConsoleState | null, form: FormData) {
  return run(detachImageCore, form);
}

export async function setSwitch(_prev: ConsoleState | null, form: FormData) {
  return run(setSwitchCore, form);
}

export async function saveTuning(_prev: ConsoleState | null, form: FormData) {
  return run(saveTuningCore, form);
}

export async function savePresets(_prev: ConsoleState | null, form: FormData) {
  return run(savePresetsCore, form);
}

export async function saveMediaSettings(_prev: ConsoleState | null, form: FormData) {
  return run(saveMediaSettingsCore, form);
}

export async function uploadMedia(_prev: ConsoleState | null, form: FormData) {
  return run(uploadMediaCore, form);
}

export async function updateMediaAlt(_prev: ConsoleState | null, form: FormData) {
  return run(updateMediaAltCore, form);
}

export async function removeMedia(_prev: ConsoleState | null, form: FormData) {
  return run(removeMediaCore, form);
}

export async function saveTiers(_prev: ConsoleState | null, form: FormData) {
  return run(saveTiersCore, form);
}

export async function createAddOn(_prev: ConsoleState | null, form: FormData) {
  return run(createAddOnCore, form);
}

/** One action for an add-on's row (edit, retire, restore, move), so its message is the latest. */
export async function manageAddOn(_prev: ConsoleState | null, form: FormData) {
  switch (form.get("op")) {
    case "retire":
    case "restore":
      form.set("active", form.get("op") === "restore" ? "1" : "0");
      return run(setAddOnActiveCore, form);
    case "up":
    case "down":
      form.set("direction", String(form.get("op")));
      return run(moveAddOnCore, form);
    default:
      return run(updateAddOnCore, form);
  }
}

export async function grantFlashCredit(_prev: ConsoleState | null, form: FormData) {
  return run(grantFlashCreditCore, form);
}

/** 007 US3: a generated pattern becomes a resting shirt, and the editor opens on it. */
export async function saveGeneratedShirt(_prev: ConsoleState | null, form: FormData) {
  const state = saveGeneratedShirtCore(getDb(), await cookieJar(), form);
  if (state.ok && state.id) redirect(`/admin/shirts/${state.id}?saved=1`);
  return state;
}

export async function setShirtListed(_prev: ConsoleState | null, form: FormData) {
  return run(setShirtListedCore, form);
}
