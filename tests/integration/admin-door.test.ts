/**
 * The door (008 FR-003, SC-003): every console action, called by a guest or a signed-in shopper,
 * is refused and changes nothing at all. Each story adds its actions to CORES.
 */
import { describe, expect, it } from "vitest";
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
  saveSurchargeCore,
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
import { copy } from "@/lib/copy";
import type { Db, Sqlite } from "@/lib/db/client";
import type { CookieJar } from "@/lib/http/cookies";
import { form } from "../helpers/cookies";
import { createSeededTestDb } from "../helpers/db";
import { guestJar, person } from "../helpers/people";

type Core = (db: Db, jar: CookieJar, form: FormData) => ConsoleState | Promise<ConsoleState>;

/** Each action with a form an admin could plausibly send. */
const CORES: [string, Core, Record<string, string>][] = [
  [
    "createShirt",
    createShirtCore,
    {
      name: "Sneaky",
      slug: "sneaky",
      style: "polo",
      complexity: "30",
      description: "x",
      finalPriceUsd: "1.00",
    },
  ],
  [
    "updateShirt",
    updateShirtCore,
    {
      id: "1",
      name: "Hacked",
      style: "polo",
      complexity: "1",
      description: "x",
      finalPriceUsd: "1.00",
    },
  ],
  ["setShirtStatus", setShirtStatusCore, { id: "2", status: "inactive" }],
  ["attachImage", attachImageCore, { shirtId: "2", mediaId: "1" }],
  ["moveImage", moveImageCore, { shirtId: "2", mediaId: "3", direction: "down" }],
  ["detachImage", detachImageCore, { shirtId: "4", mediaId: "5" }],
  // US4
  ["uploadMedia", uploadMediaCore, { alt: "Sneaky upload" }],
  ["updateMediaAlt", updateMediaAltCore, { mediaId: "1", alt: "Hacked" }],
  ["removeMedia", removeMediaCore, { mediaId: "1" }],
  // US5
  ["saveTiers", saveTiersCore, { tiers: "[]" }],
  ["createAddOn", createAddOnCore, { name: "Sneaky", pitch: "x", declineLine: "x", priceUsd: "1" }],
  [
    "updateAddOn",
    updateAddOnCore,
    { id: "1", name: "Hacked", pitch: "x", declineLine: "x", priceUsd: "1" },
  ],
  ["setAddOnActive", setAddOnActiveCore, { id: "1", active: "0" }],
  ["moveAddOn", moveAddOnCore, { id: "1", direction: "down" }],
  // US6
  ["grantFlashCredit", grantFlashCreditCore, { userId: "1", amountUsd: "1000000", token: "x" }],
  // US2
  ["setSwitch", setSwitchCore, { key: "roachMotel", on: "0" }],
  ["saveTuning", saveTuningCore, { basePriceUsd: "1.00", perPointUsd: "1.00" }],
  ["savePresets", savePresetsCore, { presetsUsd: "1" }],
  [
    "saveMediaSettings",
    saveMediaSettingsCore,
    { mediaBaseUrl: "https://evil.example", placeholderMediaId: "2" },
  ],
  // 007 US3
  [
    "saveGeneratedShirt",
    saveGeneratedShirtCore,
    { score: "48", style: "polo", seed: "7", name: "Sneaky" },
  ],
  ["setShirtListed", setShirtListedCore, { id: "1", listed: "0" }],
  ["saveSurcharge", saveSurchargeCore, { amountUsd: "0.00" }],
];

/** Every row of every table, so "changes nothing" means nothing. */
function snapshot(sqlite: Sqlite): string {
  const tables = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all() as { name: string }[];
  return JSON.stringify(
    tables.map(({ name }) => [name, sqlite.prepare(`SELECT * FROM "${name}"`).all()]),
  );
}

describe("every console action refuses anyone who isn't an admin", () => {
  it.each(CORES)(
    "%s: a guest is asked to sign in, and nothing changes",
    async (_n, core, fields) => {
      const { db, sqlite } = createSeededTestDb();
      const before = snapshot(sqlite);
      expect(await core(db, guestJar(), form(fields))).toEqual({
        ok: false,
        message: copy.console.refused.signIn,
      });
      expect(snapshot(sqlite)).toBe(before);
    },
  );

  it.each(CORES)("%s: a shopper gets nothing, and nothing changes", async (_n, core, fields) => {
    const { db, sqlite } = createSeededTestDb();
    const shopper = person(db);
    const before = snapshot(sqlite);
    expect(await core(db, shopper.jar, form(fields))).toEqual({
      ok: false,
      message: copy.console.refused.notFound,
    });
    expect(snapshot(sqlite)).toBe(before);
  });
});
