import { expect } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { addShirt, signUp, test, uniqueEmail, visible } from "./helpers";

const { labels } = copy.shame;

test.describe("US2 — confirmshaming", () => {
  test("Remove makes him feel it, and still removes", async ({ page }) => {
    await addShirt(page, "geo-riot", "M");
    await page.goto("/cart");
    const remove = visible(page.getByTestId("cart-line")).getByRole("button", {
      name: labels.remove.shamed,
      exact: true,
    });
    await expect(remove).toBeVisible();
    await remove.click();
    await expect(visible(page.getByTestId("empty-cart"))).toBeVisible();
  });

  test("Sign out makes him feel it, and still signs out", async ({ page }, info) => {
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);
    await visible(page.getByRole("button", { name: labels.signOut.shamed, exact: true })).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in\?next=/);
  });

  test("insisting on the bland shirt reads like a confession", async ({ page }) => {
    await page.goto("/shirts/beige-regret");
    await page.locator("label").filter({ hasText: /^S$/ }).click();
    await visible(page.getByRole("button", { name: "Add to cart" })).click();
    const dialog = visible(page.getByTestId("shame-dialog"));
    await expect(
      dialog.getByRole("button", { name: labels.insist.shamed, exact: true }),
    ).toBeVisible();
  });
});
