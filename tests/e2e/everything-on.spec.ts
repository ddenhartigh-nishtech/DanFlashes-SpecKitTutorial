import { expect } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import {
  awesomeButton,
  confirmTwice,
  signUp,
  test,
  uniqueEmail,
  untickAddOns,
  visible,
} from "./helpers";

/**
 * With Extreme Awesomeness on, the store still works exactly as it does with it off (SC-005,
 * analysis C1): browse, zoom, add, the cart and the roach motel, checkout by card, the account.
 */
test("everything on: the whole journey still works", async ({ page }, info) => {
  test.slow(); // a sign-up, the cart, a card checkout, the account, with the pipes growing
  if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });
  const on = () => expect(page.locator("html")).toHaveAttribute("data-awesome", "on");

  await page.goto("/sign-up");
  await awesomeButton(page).click();
  await on();
  await signUp(page, uniqueEmail(info.project.name));
  await expect(page).toHaveURL(/\/account$/);

  // Browse, zoom, add.
  await page.goto("/shirts");
  await on();
  await visible(page.getByTestId("shirt-card"))
    .filter({ hasText: "Geo Riot" })
    .getByRole("link")
    .first()
    .click();
  await expect(page).toHaveURL(/\/shirts\/geo-riot$/);
  await visible(page.getByRole("button", { name: "ENHANCE" })).click();
  await page.locator("label").filter({ hasText: /^M$/ }).click();
  await visible(page.getByRole("button", { name: copy.product.addToCart })).click();
  await expect(visible(page.getByText(copy.product.added))).toBeVisible();

  // The cart: raise, then lower through the roach motel.
  await page.goto("/cart");
  await on();
  const line = visible(page.getByTestId("cart-line")).filter({ hasText: "Geo Riot" });
  await line.getByLabel(copy.cart.quantity).fill("2");
  await line.getByRole("button", { name: copy.cart.update }).click();
  await expect(line.getByTestId("stock-line")).toHaveText(copy.urgency.fewMore);
  await line.getByLabel(copy.cart.quantity).fill("1");
  await line.getByRole("button", { name: copy.cart.update }).click();
  await confirmTwice(page);
  await expect(line.getByLabel(copy.cart.quantity)).toHaveValue("1");
  await expect(line.getByTestId("price")).toHaveText("$344.61");

  // Checkout by card.
  await visible(page.getByRole("link", { name: copy.cart.checkout, exact: true })).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await on();
  await untickAddOns(page);
  await expect(visible(page.getByTestId("total"))).toHaveText("$344.61");
  await visible(page.getByLabel("Card number")).fill("4242 4242 4242 4242");
  await visible(page.getByLabel("Expiry (MM/YY)")).fill("12/29");
  await visible(page.getByLabel("CVC")).fill("123");
  await visible(page.getByRole("button", { name: /Place order/ })).click();
  await expect(page).toHaveURL(/\/orders\/\d+$/, { timeout: 30_000 });
  await expect(visible(page.getByTestId("payment"))).toHaveText("Charged to Visa ending 4242");

  // The account shows it.
  await page.goto("/account");
  await on();
  await expect(visible(page.getByTestId("order")).first()).toContainText("Geo Riot");
});
