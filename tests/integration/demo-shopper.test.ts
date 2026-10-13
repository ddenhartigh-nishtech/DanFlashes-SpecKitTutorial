import { describe, expect, it } from "vitest";
import { signIn } from "@/lib/auth/accounts";
import { ensureDemoShopper, type DemoShopper } from "@/lib/data/demo-shopper";
import { getBalanceUsd } from "@/lib/flash-credit/ledger";
import { listOrdersForUser } from "@/lib/orders/orders";
import { createSeededTestDb } from "../helpers/db";

const DEMO: DemoShopper = {
  email: "demo@danflashes.local",
  password: "password123",
  displayName: "Demo Dan",
  creditUsd: "10000.00",
  pastOrder: { slug: "fractal-fury", size: "XL" },
};

describe("ensureDemoShopper", () => {
  it("creates a shopper who can sign in, with $10,000 credit and one past card order", async () => {
    const { db } = createSeededTestDb();
    const { created, userId } = await ensureDemoShopper(db, DEMO);
    expect(created).toBe(true);
    expect(await signIn(db, { email: DEMO.email, password: DEMO.password })).toEqual({
      ok: true,
      userId,
    });
    expect(getBalanceUsd(db, userId)).toBe("10000.00");
    const orders = listOrdersForUser(db, userId);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ totalUsd: "999.99", payment: { method: "card" } });
  });

  it("is idempotent: running it again changes nothing", async () => {
    const { db, sqlite } = createSeededTestDb();
    const first = await ensureDemoShopper(db, DEMO);
    const second = await ensureDemoShopper(db, DEMO);
    expect(second).toEqual({ created: false, userId: first.userId });
    expect(sqlite.prepare("SELECT count(*) AS n FROM users").get()).toEqual({ n: 1 });
    expect(sqlite.prepare("SELECT count(*) AS n FROM orders").get()).toEqual({ n: 1 });
    expect(getBalanceUsd(db, first.userId)).toBe("10000.00");
  });

  it("fails loudly if the past-order shirt doesn't exist", async () => {
    const { db } = createSeededTestDb();
    await expect(
      ensureDemoShopper(db, { ...DEMO, pastOrder: { slug: "no-such-shirt", size: "M" } }),
    ).rejects.toThrow(/no-such-shirt/);
  });
});
