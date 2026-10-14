/** Revenue stream action logic (003 contracts/changes.md → New actions). */
import { field, failure, sessionUser, type ActionState } from "@/lib/actions/state";
import { copy } from "@/lib/copy";
import type { Db } from "@/lib/db/client";
import type { CookieJar } from "@/lib/http/cookies";
import { cashIn, connectStream, disconnectStream } from "@/lib/streams/streams";

const id = (form: FormData, name: string): number => {
  const value = Number(field(form, name));
  return Number.isInteger(value) && value > 0 ? value : 0;
};

export function connectStreamCore(
  db: Db,
  jar: CookieJar,
  form: FormData,
  now: Date = new Date(),
): ActionState {
  const user = sessionUser(db, jar);
  if (!user) return failure("SIGN_IN_REQUIRED");
  const result = connectStream(
    db,
    user.id,
    {
      preset: field(form, "preset"),
      customName: field(form, "customName"),
      amountUsd: field(form, "amountUsd"),
      schedule: field(form, "schedule"),
      intervalCount: field(form, "intervalCount"),
      intervalUnit: field(form, "intervalUnit"),
      startsAt: field(form, "startsAt"),
      endsAt: field(form, "endsAt"),
      ongoing: field(form, "ongoing") === "on",
    },
    now,
  );
  if (!result.ok) return failure(result.code);
  const oneTime = field(form, "schedule") === "one_time";
  return { ok: true, message: oneTime ? copy.streams.applied : copy.streams.connected };
}

export function disconnectStreamCore(
  db: Db,
  jar: CookieJar,
  form: FormData,
  now: Date = new Date(),
): ActionState {
  const user = sessionUser(db, jar);
  if (!user) return failure("SIGN_IN_REQUIRED");
  const result = disconnectStream(db, user.id, id(form, "streamId"), now);
  return result.ok ? { ok: true, message: copy.streams.disconnected } : failure(result.code);
}

export function cashInCore(
  db: Db,
  jar: CookieJar,
  form: FormData,
  now: Date = new Date(),
): ActionState {
  const user = sessionUser(db, jar);
  if (!user) return failure("SIGN_IN_REQUIRED");
  const result = cashIn(db, user.id, {
    streamId: id(form, "streamId"),
    paymentNo: id(form, "paymentNo"),
    now,
  });
  return result.ok ? { ok: true, message: copy.streams.cashedIn } : failure(result.code);
}
