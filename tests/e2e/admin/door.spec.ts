import { expect, type Page } from "@playwright/test";
import { test, uniqueEmail, visible, signUp } from "../helpers";
import { CONSOLE_PAGES, expectStore404, signInAsOwner } from "./helpers";

/** The header's way into the console (phones: inside the menu). */
async function backOfficeLink(page: Page) {
  const menu = page.locator("summary", { hasText: "Menu" });
  if (await menu.isVisible()) await menu.click();
  return visible(page.getByTestId("back-office-link"));
}

test.describe("US1 — the door (FR-001–FR-004)", () => {
  test("a guest gets the store's ordinary 404 at every console address", async ({ page }) => {
    for (const path of CONSOLE_PAGES) {
      await page.goto(path);
      await expectStore404(page);
    }
  });

  test("a signed-in shopper gets the same 404, and no way in", async ({ page }, info) => {
    test.slow(); // a real sign-up, then every console address
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/, { timeout: 30_000 });
    expect(await (await backOfficeLink(page)).count()).toBe(0);
    for (const path of CONSOLE_PAGES) {
      await page.goto(path);
      await expectStore404(page);
    }
  });

  test("the owner sees Back office in the header, and it opens the calm office", async ({
    page,
  }) => {
    await signInAsOwner(page);
    const link = await backOfficeLink(page);
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator(".office")).toBeVisible();
    await expect(page.getByTestId("poster")).toHaveCount(1);
  });
});
