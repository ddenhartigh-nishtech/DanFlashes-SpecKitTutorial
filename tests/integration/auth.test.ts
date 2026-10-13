import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signIn, signUp } from "@/lib/auth/accounts";
import { safeNext } from "@/lib/auth/safe-next";
import { createSession, deleteSession, findSessionUser } from "@/lib/auth/session";
import { createTestDb } from "../helpers/db";

describe("signUp", () => {
  it("lowercases and trims the email and stores only a bcrypt (cost 12) hash", async () => {
    const { db, sqlite } = createTestDb();
    const result = await signUp(db, {
      email: "  Greg@Example.COM ",
      password: "complicated",
      displayName: "Greg",
    });
    expect(result).toEqual({ ok: true, userId: expect.any(Number) });
    const row = sqlite.prepare("SELECT email, password_hash, display_name FROM users").get() as {
      email: string;
      password_hash: string;
      display_name: string;
    };
    expect(row.email).toBe("greg@example.com");
    expect(row.password_hash).toMatch(/^\$2[aby]\$12\$/);
    expect(row.password_hash).not.toContain("complicated");
    expect(row.display_name).toBe("Greg");
  });

  it.each([
    [{ email: "not-an-email", password: "complicated" }, "INVALID_EMAIL"],
    [{ email: "a@b.co", password: "short" }, "WEAK_PASSWORD"],
  ])("refuses %j with %s", async (input, code) => {
    const { db } = createTestDb();
    expect(await signUp(db, { ...input, displayName: null })).toEqual({ ok: false, code });
  });

  it("refuses a duplicate email regardless of case", async () => {
    const { db } = createTestDb();
    await signUp(db, { email: "dup@x.io", password: "complicated", displayName: null });
    expect(
      await signUp(db, { email: "DUP@x.io", password: "complicated", displayName: null }),
    ).toEqual({
      ok: false,
      code: "EMAIL_TAKEN",
    });
  });
});

describe("signIn", () => {
  it("accepts the right password, case-insensitively on email", async () => {
    const { db } = createTestDb();
    const created = await signUp(db, {
      email: "dan@flashes.biz",
      password: "complicated",
      displayName: null,
    });
    expect(await signIn(db, { email: "DAN@flashes.biz", password: "complicated" })).toEqual(
      created,
    );
  });

  it("gives the same answer for an unknown email and a wrong password", async () => {
    const { db } = createTestDb();
    await signUp(db, { email: "dan@flashes.biz", password: "complicated", displayName: null });
    const wrong = await signIn(db, { email: "dan@flashes.biz", password: "nope-nope" });
    const unknown = await signIn(db, { email: "who@flashes.biz", password: "complicated" });
    expect(wrong).toEqual({ ok: false, code: "BAD_CREDENTIALS" });
    expect(unknown).toEqual(wrong);
  });
});

describe("sessions", () => {
  it("stores only the SHA-256 of the token and finds the user by token", async () => {
    const { db, sqlite } = createTestDb();
    const { userId } = (await signUp(db, {
      email: "s@x.io",
      password: "complicated",
      displayName: "Sal",
    })) as { userId: number };
    const now = new Date("2026-10-13T12:00:00Z");
    const { token, expiresAt } = createSession(db, userId, now);

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 random bytes, base64url
    expect(expiresAt).toBe("2026-11-12T12:00:00.000Z");
    const stored = sqlite.prepare("SELECT token_hash FROM sessions").get() as {
      token_hash: string;
    };
    expect(stored.token_hash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(JSON.stringify(sqlite.prepare("SELECT * FROM sessions").all())).not.toContain(token);

    expect(findSessionUser(db, token, now)).toEqual({
      id: userId,
      email: "s@x.io",
      displayName: "Sal",
    });
  });

  it("rejects expired, unknown, and deleted sessions", async () => {
    const { db } = createTestDb();
    const { userId } = (await signUp(db, {
      email: "e@x.io",
      password: "complicated",
      displayName: null,
    })) as { userId: number };
    const { token } = createSession(db, userId, new Date("2026-01-01T00:00:00Z"));

    expect(findSessionUser(db, token, new Date("2026-03-01T00:00:00Z"))).toBeNull();
    expect(findSessionUser(db, "made-up-token", new Date("2026-01-02T00:00:00Z"))).toBeNull();
    expect(findSessionUser(db, undefined, new Date())).toBeNull();

    deleteSession(db, token);
    expect(findSessionUser(db, token, new Date("2026-01-02T00:00:00Z"))).toBeNull();
  });
});

describe("safeNext", () => {
  it.each([
    ["/checkout", "/checkout"],
    ["/shirts?tier=6&sort=price-desc", "/shirts?tier=6&sort=price-desc"],
    [null, "/account"],
    ["", "/account"],
    ["https://evil.example", "/account"],
    ["//evil.example", "/account"],
    ["/\\evil.example", "/account"],
    ["checkout", "/account"],
  ])("%j → %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});
