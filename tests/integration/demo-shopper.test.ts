import { describe, expect, it } from "vitest";
import { signIn } from "@/lib/auth/accounts";
import { adminUser } from "@/lib/auth/admin";
import { createSession } from "@/lib/auth/session";
import { ensureDemoOwner, ensureDemoShopper, type DemoShopper } from "@/lib/data/demo-shopper";
import { SESSION_COOKIE } from "@/lib/http/cookies";
import { FakeCookieJar } from "../helpers/cookies";
import { getBalanceUsd, listEntries } from "@/lib/flash-credit/ledger";
import { listOrdersForUser } from "@/lib/orders/orders";
import { listStreams } from "@/lib/streams/streams";
import { createSeededTestDb } from "../helpers/db";

const DEMO: DemoShopper = {
  email: "demo@danflashes.local",
  password: "password123",
  displayName: "Demo Dan",
  creditUsd: "10000.00",
  pastOrder: { slug: "fractal-fury", size: "XL" },
};

describe("ensureDemoShopper", () => {
  it("connects an ongoing per diem after the past order, and its first payday lands", async () => {
    const { db } = createSeededTestDb();
    const { userId } = await ensureDemoShopper(db, { ...DEMO, perDiem: { amountUsd: "75.00" } });
    expect(listStreams(db, userId, new Date())).toMatchObject([
      {
        name: "Per Diem",
        isPerDiem: true,
        amountUsd: "75.00",
        schedule: "recurring",
        intervalMinutes: 1440, // a per diem tops off daily
        endsAt: null,
      },
    ]);
    expect(getBalanceUsd(db, userId)).toBe("10075.00");
    expect(listEntries(db, userId)[0]).toMatchObject({ kind: "stream", amountUsd: "75.00" });
  });

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

describe("ensureDemoOwner (008 R3)", () => {
  const OWNER = { email: "owner@danflashes.test", password: "the-office-test", displayName: "Dan" };

  it("creates the owner once, through real sign-up, with the admin flag on", async () => {
    const { db, sqlite } = createSeededTestDb();
    const first = await ensureDemoOwner(db, OWNER);
    const second = await ensureDemoOwner(db, OWNER);
    expect(first.created).toBe(true);
    expect(second).toEqual({ created: false, userId: first.userId });
    expect(await signIn(db, OWNER)).toEqual({ ok: true, userId: first.userId });
    const { token } = createSession(db, first.userId);
    expect(adminUser(db, new FakeCookieJar({ [SESSION_COOKIE]: token }))).not.toBeNull();
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM users WHERE is_admin = 1").get()).toEqual({
      n: 1,
    });
  });
});
