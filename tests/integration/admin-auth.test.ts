import { describe, expect, it } from "vitest";
import { adminUser, setAdmin } from "@/lib/auth/admin";
import { findSessionUser } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/http/cookies";
import { createTestDb } from "../helpers/db";
import { guestJar, person } from "../helpers/people";

describe("setAdmin (008 FR-001, R3)", () => {
  it("sets and clears the flag by email, case-insensitively, and says whether it changed", () => {
    const { db } = createTestDb();
    person(db, { email: "dan@danflashes.test" });
    expect(setAdmin(db, "  DAN@danflashes.test ", true)).toEqual({ ok: true, changed: true });
    expect(setAdmin(db, "dan@danflashes.test", true)).toEqual({ ok: true, changed: false });
    expect(setAdmin(db, "dan@danflashes.test", false)).toEqual({ ok: true, changed: true });
  });

  it("reports an unknown email and changes nothing", () => {
    const { db } = createTestDb();
    expect(setAdmin(db, "nobody@danflashes.test", true)).toEqual({ ok: false });
  });
});

describe("the session knows who's an admin", () => {
  it("returns isAdmin with the session user", () => {
    const { db } = createTestDb();
    const shopper = person(db);
    const owner = person(db, { admin: true });
    expect(findSessionUser(db, shopper.jar.get(SESSION_COOKIE))?.isAdmin).toBe(false);
    expect(findSessionUser(db, owner.jar.get(SESSION_COOKIE))?.isAdmin).toBe(true);
  });

  it("adminUser is null for a guest or a shopper, and the user for an admin", () => {
    const { db } = createTestDb();
    const shopper = person(db);
    const owner = person(db, { admin: true });
    expect(adminUser(db, guestJar())).toBeNull();
    expect(adminUser(db, shopper.jar)).toBeNull();
    expect(adminUser(db, owner.jar)).toMatchObject({ id: owner.id, isAdmin: true });
  });

  it("an admin no longer loses the console on the very next lookup, mid-session", () => {
    const { db } = createTestDb();
    const owner = person(db, { admin: true, email: "was@danflashes.test" });
    expect(adminUser(db, owner.jar)).not.toBeNull();
    setAdmin(db, "was@danflashes.test", false);
    expect(adminUser(db, owner.jar)).toBeNull();
  });
});
