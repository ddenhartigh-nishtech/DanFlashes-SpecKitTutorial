/** `{ ok: true, ...data } | { ok: false, code, ...detail }` — the shape every mutation returns. */
export type Ok<T extends object = object> = { ok: true } & T;
export type Err<C extends string, D extends object = object> = { ok: false; code: C } & D;
