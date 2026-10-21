/**
 * PSSB comes to you (012 FR-012–FR-014, R9): every 2 minutes since his last approach or reply, on a
 * clock every tab in the browser shares, and never while the shopper is typing, a reply is arriving,
 * a dialog is open, or the tab is hidden. Pure, so the timing is testable without a browser.
 */
export const APPROACH_EVERY_MS = 120_000;
/** localStorage: when PSSB last approached or replied (ms), shared by every tab. */
export const LAST_KEY = "df-pssb-last";
/** localStorage: the shopper closed PSSB since his last approach. */
export const CLOSED_KEY = "df-pssb-closed";
/** sessionStorage: this tab's conversation, for the visit. */
export const CHAT_KEY = "df-pssb-chat";

export interface Blockers {
  typing: boolean;
  streaming: boolean;
  dialogOpen: boolean;
  hidden: boolean;
}

/** Whether PSSB should approach now. With no clock yet, the caller starts it instead. */
export function approachDue(now: number, last: number | null, blockers: Blockers): boolean {
  if (last === null) return false;
  if (blockers.typing || blockers.streaming || blockers.dialogOpen || blockers.hidden) return false;
  return now - last >= APPROACH_EVERY_MS;
}
