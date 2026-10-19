import { describe, expect, it } from "vitest";
import {
  createAddOnCore,
  moveAddOnCore,
  setAddOnActiveCore,
  updateAddOnCore,
} from "@/lib/actions/admin/add-ons";
import { listAllAddOns, listOfferedAddOns } from "@/lib/data/add-ons";
import type { Sqlite } from "@/lib/db/client";
import { form } from "../helpers/cookies";
import { createSeededTestDb } from "../helpers/db";
import { person } from "../helpers/people";

function setup() {
  const test = createSeededTestDb();
  return { ...test, jar: person(test.db, { admin: true }).jar };
}

const addOn = (fields: Record<string, string> = {}) =>
  form({
    name: "Shape Insurance",
    pitch: "Every shape, insured.",
    declineLine: "No thanks, I'll risk my shapes.",
    priceUsd: "25",
    ...fields,
  });
const offered = (db: Parameters<typeof listOfferedAddOns>[0]) =>
  listOfferedAddOns(db, { preCheckedAddOns: true }).map((a) => a.name);
const count = (sqlite: Sqlite) =>
  (sqlite.prepare("SELECT COUNT(*) AS n FROM add_ons").get() as { n: number }).n;

describe("add-ons in the console (008 FR-031)", () => {
  it("creates one at the end of checkout's list, with whole dollars kept as dollars and cents", () => {
    const { db, jar } = setup();
    expect(createAddOnCore(db, jar, addOn()).ok).toBe(true);
    const created = listAllAddOns(db).at(-1)!;
    expect(created).toMatchObject({ name: "Shape Insurance", priceUsd: "25.00", active: true });
    expect(offered(db).at(-1)).toBe("Shape Insurance");
  });

  it.each([
    [{ name: "" }],
    [{ name: "x".repeat(61) }],
    [{ name: "complexity insurance" }], // taken, in any case
    [{ pitch: "x".repeat(161) }],
    [{ declineLine: "  " }],
    [{ priceUsd: "0" }],
    [{ priceUsd: "abc" }],
  ])("refuses %j and writes nothing", (fields) => {
    const { db, sqlite, jar } = setup();
    const before = count(sqlite);
    expect(createAddOnCore(db, jar, addOn(fields)).ok).toBe(false);
    expect(count(sqlite)).toBe(before);
  });

  it("edits one; an order placed before keeps what was paid", () => {
    const { db, sqlite, jar } = setup();
    const plan = listAllAddOns(db)[0];
    sqlite.exec(`
      INSERT INTO users (id, email, password_hash) VALUES (900, 'paid@x.io', 'h');
      INSERT INTO orders (id, user_id, checkout_token, subtotal_usd, total_usd, payment_method, card_brand, card_last4)
        VALUES (900, 900, 'tok-900', '49.99', '49.99', 'card', 'Visa', '4242');
      INSERT INTO order_add_ons (order_id, add_on_id, name, price_usd, position)
        VALUES (900, ${plan.id}, '${plan.name}', '${plan.priceUsd}', 1);
    `);
    const state = updateAddOnCore(
      db,
      jar,
      addOn({ id: String(plan.id), name: "Pattern Protection Plan Plus™", priceUsd: "59.99" }),
    );
    expect(state.ok).toBe(true);
    expect(listAllAddOns(db)[0]).toMatchObject({
      name: "Pattern Protection Plan Plus™",
      priceUsd: "59.99",
    });
    expect(
      sqlite.prepare("SELECT name, price_usd FROM order_add_ons WHERE order_id = 900").get(),
    ).toEqual({
      name: plan.name,
      price_usd: plan.priceUsd,
    });
  });

  it("retires and restores; checkout follows", () => {
    const { db, jar } = setup();
    const plan = listAllAddOns(db)[0];
    expect(setAddOnActiveCore(db, jar, form({ id: String(plan.id), active: "0" })).ok).toBe(true);
    expect(offered(db)).not.toContain(plan.name);
    expect(listAllAddOns(db)[0].active).toBe(false); // retired, never deleted
    expect(setAddOnActiveCore(db, jar, form({ id: String(plan.id), active: "1" })).ok).toBe(true);
    expect(offered(db)).toContain(plan.name);
  });

  it("moves one down and back up; the ends stay put", () => {
    const { db, jar } = setup();
    const names = () => listAllAddOns(db).map((a) => a.name);
    const [first, second] = names();
    const firstId = String(listAllAddOns(db)[0].id);
    expect(moveAddOnCore(db, jar, form({ id: firstId, direction: "down" })).ok).toBe(true);
    expect(names().slice(0, 2)).toEqual([second, first]);
    expect(moveAddOnCore(db, jar, form({ id: firstId, direction: "up" })).ok).toBe(true);
    expect(names().slice(0, 2)).toEqual([first, second]);
    expect(moveAddOnCore(db, jar, form({ id: firstId, direction: "up" })).ok).toBe(true);
    expect(names()[0]).toBe(first);
  });

  it("refuses an unknown add-on", () => {
    const { db, jar } = setup();
    expect(updateAddOnCore(db, jar, addOn({ id: "9999" })).ok).toBe(false);
    expect(setAddOnActiveCore(db, jar, form({ id: "9999", active: "0" })).ok).toBe(false);
    expect(moveAddOnCore(db, jar, form({ id: "9999", direction: "up" })).ok).toBe(false);
  });
});
