/**
 * Extreme Awesomeness (006 R2, R3): his choice is his browser's. One local-storage value, shared by
 * every tab and kept for later visits, never sent to the store or saved to an account.
 */

export const AWESOME_KEY = "df-awesome";
export const AWESOME_ATTR = "data-awesome";

type Reads = Pick<Storage, "getItem">;
type Writes = Pick<Storage, "setItem">;
type Root = {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
};

export const parseChoice = (value: string | null | undefined): boolean => value === "1";

export const serializeChoice = (on: boolean): "1" | "0" => (on ? "1" : "0");

/** Some private modes refuse storage: then it's simply off, and nothing throws. */
export function readChoice(storage: Reads | undefined): boolean {
  try {
    return parseChoice(storage?.getItem(AWESOME_KEY));
  } catch {
    return false;
  }
}

export function writeChoice(storage: Writes | undefined, on: boolean): void {
  try {
    storage?.setItem(AWESOME_KEY, serializeChoice(on));
  } catch {
    // refused: it lasts as long as this page does
  }
}

/** Everything Extreme Awesomeness does keys off this one attribute on <html>. */
export function applyChoice(root: Root, on: boolean): void {
  if (on) root.setAttribute(AWESOME_ATTR, "on");
  else root.removeAttribute(AWESOME_ATTR);
}

/**
 * The inline <head> script. It runs while the HTML is still parsing, so a page he opens with it on
 * is painted on from the first frame (FR-009), and the layout stays prerenderable.
 */
export function firstPaintScript(): string {
  const key = JSON.stringify(AWESOME_KEY);
  const attr = JSON.stringify(AWESOME_ATTR);
  return `try{if(localStorage.getItem(${key})==="1")document.documentElement.setAttribute(${attr},"on")}catch(e){}`;
}
