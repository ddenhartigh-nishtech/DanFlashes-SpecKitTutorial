import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Next 16 keeps previously visited routes mounted but hidden (React <Activity>), so a locator can
 * match a hidden copy on an earlier page. Always target the visible one.
 */
export const visible = (locator: Locator) => locator.filter({ visible: true });

/** Unique per run and project so desktop and phone never collide on the shared e2e database. */
export const uniqueEmail = (project: string) =>
  `e2e+${project}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@danflashes.local`;

export async function addShirt(page: Page, slug: string, size: string) {
  await page.goto(`/shirts/${slug}`);
  await page
    .locator("label")
    .filter({ hasText: new RegExp(`^${size}$`) })
    .click();
  await visible(page.getByRole("button", { name: "Add to cart" })).click();
  await expect(visible(page.getByText("It's in the cart. Excellent decision."))).toBeVisible();
}

export async function signUp(page: Page, email: string) {
  await visible(page.getByLabel("What should Dan call you?")).fill("Greg");
  await visible(page.getByLabel("Email")).fill(email);
  await visible(page.getByLabel("Password")).fill("complicated");
  await visible(page.getByRole("button", { name: "Sign up" })).click();
}
