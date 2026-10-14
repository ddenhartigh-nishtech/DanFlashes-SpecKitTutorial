import { describe, expect, it } from "vitest";
import { signUpCore } from "@/lib/actions/auth";
import { cashInCore, connectStreamCore, disconnectStreamCore } from "@/lib/actions/streams";
import { addItem, getOrCreateCart } from "@/lib/cart/cart";
import { placeOrder } from "@/lib/checkout/place-order";
import { copy } from "@/lib/copy";
import { getBalanceUsd } from "@/lib/flash-credit/ledger";
import { connectStream, listStreams } from "@/lib/streams/streams";
import { FakeCookieJar, form } from "../helpers/cookies";
import { createSeededTestDb } from "../helpers/db";

const NOW = new Date("2026-10-14T12:00:00.000Z");
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

const perDiemForm = (extra: Record<string, string> = {}) =>
  form({
    preset: "per_diem",
    amountUsd: "75.00",
    schedule: "recurring",
    intervalCount: "5",
    intervalUnit: "minutes",
    ongoing: "on",
    ...extra,
  });

async function signedIn() {
  const test = createSeededTestDb();
  const jar = new FakeCookieJar();
  await signUpCore(
    test.db,
    jar,
    form({ email: "dan@example.com", password: "complicated", displayName: "Dan" }),
  );
  const userId = (test.sqlite.prepare("SELECT id FROM users").get() as { id: number }).id;
  return { ...test, jar, userId };
}

describe("connectStream / disconnectStream / cashIn actions", () => {
  it("send guests to sign in first", () => {
    const { db } = createSeededTestDb();
    const guest = new FakeCookieJar();
    const signIn = { ok: false, code: "SIGN_IN_REQUIRED", message: copy.codes.SIGN_IN_REQUIRED };
    expect(connectStreamCore(db, guest, perDiemForm(), NOW)).toEqual(signIn);
    expect(disconnectStreamCore(db, guest, form({ streamId: "1" }), NOW)).toEqual(signIn);
    expect(cashInCore(db, guest, form({ streamId: "1", paymentNo: "1" }), NOW)).toEqual(signIn);
  });

  it("connect, cash in, and disconnect for a signed-in shopper", async () => {
    const { db, jar, userId } = await signedIn();
    expect(connectStreamCore(db, jar, perDiemForm(), NOW)).toEqual({
      ok: true,
      message: copy.streams.connected,
    });
    expect(
      connectStreamCore(
        db,
        jar,
        form({
          preset: "custom",
          customName: "Craig owes me",
          amountUsd: "40",
          schedule: "whenever",
          ongoing: "on",
        }),
        NOW,
      ),
    ).toMatchObject({ ok: true });
    const craig = listStreams(db, userId, NOW).find((s) => s.name === "Craig owes me")!;
    expect(cashInCore(db, jar, form({ streamId: String(craig.id), paymentNo: "1" }), NOW)).toEqual({
      ok: true,
      message: copy.streams.cashedIn,
    });
    expect(getBalanceUsd(db, userId)).toBe("115.00");
    expect(disconnectStreamCore(db, jar, form({ streamId: String(craig.id) }), later(1))).toEqual({
      ok: true,
      message: copy.streams.disconnected,
    });
  });

  it.each([
    ["INVALID_STREAM_AMOUNT", { amountUsd: "0.00" }],
    ["INVALID_STREAM_NAME", { preset: "custom", customName: "" }],
    ["INVALID_WINDOW", { ongoing: "", endsAt: "" }],
    ["INVALID_INTERVAL", { intervalCount: "0" }],
  ])("pass %s through in brand voice", async (code, extra) => {
    const { db, jar } = await signedIn();
    expect(connectStreamCore(db, jar, perDiemForm(extra), NOW)).toEqual({
      ok: false,
      code,
      message: copy.codes[code as keyof typeof copy.codes],
    });
  });

  it("pass PER_DIEM_EXISTS, STREAM_NOT_FOUND and NOT_CASHABLE through", async () => {
    const { db, jar, userId } = await signedIn();
    connectStreamCore(db, jar, perDiemForm(), NOW);
    expect(connectStreamCore(db, jar, perDiemForm(), NOW)).toMatchObject({
      code: "PER_DIEM_EXISTS",
    });
    expect(disconnectStreamCore(db, jar, form({ streamId: "999" }), NOW)).toMatchObject({
      code: "STREAM_NOT_FOUND",
    });
    const perDiem = listStreams(db, userId, NOW)[0];
    expect(
      cashInCore(db, jar, form({ streamId: String(perDiem.id), paymentNo: "2" }), NOW),
    ).toMatchObject({ code: "NOT_CASHABLE" });
  });
});

describe("placeOrder settles streams first", () => {
  it("can spend a payment that came due before checkout, in the same transaction", () => {
    const { db, sqlite } = createSeededTestDb();
    const userId = (
      sqlite
        .prepare("INSERT INTO users (email, password_hash) VALUES ('dan@x.io', 'h') RETURNING id")
        .get() as { id: number }
    ).id;
    const connected = connectStream(
      db,
      userId,
      {
        preset: "per_diem",
        customName: "",
        amountUsd: "500.00",
        schedule: "recurring",
        intervalCount: "5",
        intervalUnit: "minutes",
        startsAt: "",
        endsAt: "",
        ongoing: true,
      },
      NOW,
    );
    expect(connected.ok).toBe(true);
    expect(getBalanceUsd(db, userId)).toBe("500.00");

    const cartId = getOrCreateCart(db, { cartId: null, userId }).id;
    addItem(db, cartId, { slug: "fractal-fury", size: "M" }); // $999.99: needs the second payday
    const order = placeOrder(db, {
      userId,
      cartId: null,
      checkoutToken: "tok-payday",
      expectedTotalUsd: "999.99",
      method: "flash_credit",
      now: later(5),
    });
    expect(order).toMatchObject({ ok: true });
    expect(getBalanceUsd(db, userId)).toBe("0.01");
  });
});
