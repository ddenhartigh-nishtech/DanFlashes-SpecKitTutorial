/**
 * The roach-motel cart (005 US2, R5). Pure: does this change to the cart have to get past "Are you
 * sure?" and "Are you sure sure?" first? Every decrease does. Adding and raising never do.
 */

export type CartChange = { kind: "remove" } | { kind: "update"; current: number; next: number };

export function needsConfirm(change: CartChange, on: boolean): boolean {
  if (!on) return false;
  return change.kind === "remove" || change.next < change.current;
}
