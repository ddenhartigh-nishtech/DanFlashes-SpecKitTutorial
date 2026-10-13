import { describe, expect, it } from "vitest";
import { signUpCore } from "@/lib/actions/auth";
import { topUpCore } from "@/lib/actions/flash-credit";
import { copy } from "@/lib/copy";
import { FakeCookieJar, form } from "../helpers/cookies";
import { createSeededTestDb } from "../helpers/db";

const CARD = { cardNumber: "4242 4242 4242 4242", expiry: "12/29", cvc: "123" };

async function signedIn() {
  const test = createSeededTestDb();
  const jar = new FakeCookieJar();
  await signUpCore(test.db, jar, form({ email: "fc@x.io", password: "complicated" }));
  return { ...test, jar };
}

describe("topUpFlashCredit action", () => {
  it("requires a signed-in shopper", () => {
    const { db } = createSeededTestDb();
    expect(topUpCore(db, new FakeCookieJar(), form({ amountUsd: "500.00", ...CARD }))).toEqual({
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: copy.codes.SIGN_IN_REQUIRED,
    });
  });

  it("tops up a preset amount", async () => {
    const { db, jar } = await signedIn();
    expect(topUpCore(db, jar, form({ amountUsd: "1000.00", ...CARD }))).toEqual({
      ok: true,
      balanceUsd: "1000.00",
      message: copy.account.toppedUp,
    });
  });

  it("a custom amount wins over the preset", async () => {
    const { db, jar } = await signedIn();
    expect(
      topUpCore(db, jar, form({ amountUsd: "500.00", customAmountUsd: "12.34", ...CARD })),
    ).toMatchObject({
      ok: true,
      balanceUsd: "12.34",
    });
  });

  it("passes errors through", async () => {
    const { db, jar } = await signedIn();
    expect(topUpCore(db, jar, form({ customAmountUsd: "0.001", ...CARD }))).toMatchObject({
      ok: false,
      code: "INVALID_AMOUNT",
    });
    expect(topUpCore(db, jar, form({ amountUsd: "50.00", ...CARD, cvc: "x" }))).toMatchObject({
      ok: false,
      code: "CARD_INVALID_CVC",
    });
  });
});
