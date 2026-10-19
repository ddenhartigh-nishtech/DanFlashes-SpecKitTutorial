import { describe, expect, it } from "vitest";
import { grantFlashCreditCore } from "@/lib/actions/admin/grants";
import { getBalanceUsd } from "@/lib/flash-credit/ledger";
import { form } from "../helpers/cookies";
import { createSeededTestDb } from "../helpers/db";
import { person } from "../helpers/people";

function setup() {
  const test = createSeededTestDb();
  const owner = person(test.db, { admin: true });
  const greg = person(test.db, { displayName: "Greg" });
  return { ...test, jar: owner.jar, greg: greg.id };
}

describe("grantFlashCredit (008 FR-036)", () => {
  it("grants the amount and says so, calmly", () => {
    const { db, jar, greg } = setup();
    const state = grantFlashCreditCore(
      db,
      jar,
      form({ userId: String(greg), amountUsd: "500", token: "form-1" }),
    );
    expect(state).toEqual({ ok: true, message: "Granted $500.00 to Greg. That was generous." });
    expect(getBalanceUsd(db, greg)).toBe("500.00");
  });

  it("records a form once, however many times it's sent", () => {
    const { db, jar, greg } = setup();
    const send = () =>
      grantFlashCreditCore(
        db,
        jar,
        form({ userId: String(greg), amountUsd: "500", token: "same" }),
      );
    expect(send().ok).toBe(true);
    expect(send().ok).toBe(true);
    expect(getBalanceUsd(db, greg)).toBe("500.00");
  });

  it.each([[{ amountUsd: "0" }], [{ amountUsd: "abc" }], [{ userId: "9999" }], [{ token: "" }]])(
    "refuses %j and grants nothing",
    (patch) => {
      const { db, jar, greg } = setup();
      const state = grantFlashCreditCore(
        db,
        jar,
        form({ userId: String(greg), amountUsd: "500", token: "t", ...patch }),
      );
      expect(state.ok).toBe(false);
      expect(getBalanceUsd(db, greg)).toBe("0.00");
    },
  );
});
