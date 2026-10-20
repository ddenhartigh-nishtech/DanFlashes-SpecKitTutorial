import { expect, type Page } from "@playwright/test";
import { DEMO_OWNER } from "../../../scripts/seed-data";
import { copy } from "../../../src/lib/copy";
import { visible } from "../helpers";

/** Every console page (008, 007), for the door and calm sweeps. */
export const CONSOLE_PAGES = [
  "/admin",
  "/admin/shirts",
  "/admin/shirts/new",
  "/admin/shirts/1",
  // 007: the generator, before and after asking for a level
  "/admin/shirts/generate",
  "/admin/shirts/generate?score=48",
  "/admin/pricing",
  "/admin/media",
  "/admin/tiers",
  "/admin/add-ons",
  "/admin/settings",
  "/admin/customers",
  "/admin/customers/1",
  "/admin/orders",
  "/admin/orders/1",
] as const;

/** Sign in as the demo owner (an admin, seeded by db:reset; sign-in lives in scripts/seed-data.ts). */
export async function signInAsOwner(page: Page) {
  await page.goto("/sign-in");
  await visible(page.getByLabel("Email")).fill(DEMO_OWNER.email);
  await visible(page.getByLabel("Password")).fill(DEMO_OWNER.password);
  await visible(page.getByRole("button", { name: copy.auth.signIn })).click();
  await expect(page).toHaveURL(/\/account$/, { timeout: 30_000 });
}

/** The poster on a console page. */
export const poster = (page: Page) => visible(page.getByTestId("poster"));

/** A console form's answer. */
export const consoleMessage = (page: Page) => visible(page.getByTestId("console-message"));

/**
 * A visible control by its label (Next keeps left pages mounted, hidden). Exact for inputs; a
 * select's name includes its chosen option, so pass `exact: false` for one.
 */
export const field = (page: Page, label: string, exact = true) =>
  visible(page.getByLabel(label, { exact }));

/** The store's ordinary 404 (001), as a guest or a shopper sees it at a console address. */
export async function expectStore404(page: Page) {
  await expect(visible(page.getByText("isn't complicated enough to exist"))).toBeVisible();
  await expect(page.locator(".office")).toHaveCount(0);
  await expect(poster(page)).toHaveCount(0);
}

/** Unique per run and project, for anything a console spec creates. */
export const unique = (project: string) => `${project}-${Date.now().toString(36)}`;
