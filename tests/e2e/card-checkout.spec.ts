import { expect } from "@playwright/test";
import { addShirt, signUp, test, uniqueEmail, untickAddOns, visible } from "./helpers";

test.describe("US3 — checkout gate, account, faux card", () => {
  test("guest cart → gate → sign up → card checkout → history", async ({ page }, info) => {
    await addShirt(page, "geo-riot", "L");
    await addShirt(page, "paisley-panic", "S");

    // The gate.
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcheckout|\/sign-in\?next=\/checkout/);
    await expect(visible(page.getByTestId("gate-copy"))).toBeVisible();

    // Sign up; the guest cart comes along.
    await visible(page.getByRole("link", { name: "New here? Create an account" })).click();
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/checkout$/);
    await untickAddOns(page); // the plain baseline: shirts alone (005 analysis C1)
    const summary = visible(page.getByTestId("order-summary"));
    await expect(summary.getByRole("link", { name: "Geo Riot" })).toBeVisible();
    await expect(summary.getByRole("link", { name: "Paisley Panic" })).toBeVisible();
    await expect(visible(page.getByTestId("shipping"))).toHaveText("$0.00");
    await expect(visible(page.getByTestId("tax"))).toHaveText("$0.00");
    const subtotal = await visible(page.getByTestId("subtotal")).innerText();
    await expect(visible(page.getByTestId("total"))).toHaveText(subtotal);

    // A card that fails the checksum is refused, and nothing is placed.
    await visible(page.getByLabel("Card number")).fill("4242 4242 4242 4241");
    await visible(page.getByLabel("Expiry (MM/YY)")).fill("12/29");
    await visible(page.getByLabel("CVC")).fill("123");
    await visible(page.getByRole("button", { name: /Place order/ })).click();
    await expect(visible(page.getByTestId("checkout-error"))).toContainText("doesn't check out");
    await expect(page).toHaveURL(/\/checkout$/);

    // The test card works.
    await visible(page.getByLabel("Card number")).fill("4242 4242 4242 4242");
    await visible(page.getByLabel("Expiry (MM/YY)")).fill("12/29");
    await visible(page.getByLabel("CVC")).fill("123");
    await visible(page.getByRole("button", { name: /Place order/ })).click();
    await expect(page).toHaveURL(/\/orders\/\d+$/);
    await expect(visible(page.getByTestId("payment"))).toHaveText("Charged to Visa ending 4242");
    // Bug fix (2026-10-13): the header count must clear as soon as the order is placed.
    await expect(page.getByTestId("cart-count")).toHaveCount(0);
    await expect(visible(page.getByTestId("total"))).toHaveText(subtotal);

    // History, and the line links back to the shirt.
    await page.goto("/account");
    const order = visible(page.getByTestId("order")).first();
    await expect(order).toContainText("Charged to Visa ending 4242");
    await order.getByRole("link", { name: "Geo Riot" }).click();
    await expect(page).toHaveURL(/\/shirts\/geo-riot$/);

    // The cart was emptied.
    await page.goto("/cart");
    await expect(visible(page.getByTestId("empty-cart"))).toBeVisible();
  });

  test("signing out ends the session", async ({ page }, info) => {
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);
    await visible(page.getByRole("button", { name: "Sign out (go back to being normal)" })).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in\?next=/);
  });
});
