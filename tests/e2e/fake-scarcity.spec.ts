import { expect } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { signUp, test, uniqueEmail, visible } from "./helpers";

const u = copy.urgency;

test.describe("US1 — fake scarcity", () => {
  test("only 1 left, we found another one, and just kidding once he's bought it", async ({
    page,
  }, info) => {
    test.slow(); // a sign-up, the cart and a checkout: more than 60 s on a busy machine
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);

    // Quickstart 1: every card is running out, except the ones nobody wants.
    const card = (name: string) =>
      visible(page.getByTestId("shirt-card")).filter({ hasText: name }).getByTestId("stock-line");
    await page.goto("/shirts");
    await expect(card("Geo Riot")).toHaveText(u.scarce);
    await expect(card("Beige Regret")).toHaveText(u.plenty);
    await page.goto("/");
    await expect(visible(page.getByTestId("stock-line")).first()).toBeVisible();

    // 2–3: beside the price, and "found another one" on the add.
    await page.goto("/shirts/geo-riot");
    const stock = visible(page.getByTestId("stock-line"));
    await expect(stock).toHaveText(u.scarce);
    await page.locator("label").filter({ hasText: /^M$/ }).click();
    await visible(page.getByRole("button", { name: "Add to cart" })).click();
    await expect(
      visible(page.getByRole("status")).filter({ hasText: u.foundAnother }),
    ).toContainText(copy.product.added);
    await expect(stock).toHaveText(u.scarce);

    // 4: the cart line, a raise that finds another one, and a cut that doesn't.
    await page.goto("/cart");
    const line = visible(page.getByTestId("cart-line")).filter({ hasText: "Geo Riot" });
    await expect(line.getByTestId("stock-line")).toHaveText(u.scarce);
    await line.getByLabel(copy.cart.quantity).fill("3");
    await line.getByRole("button", { name: copy.cart.update }).click();
    await expect(line.getByRole("status")).toHaveText(u.foundAnother);
    await line.getByLabel(copy.cart.quantity).fill("2");
    await line.getByRole("button", { name: copy.cart.update }).click();
    await expect(line.getByLabel(copy.cart.quantity)).toHaveValue("2");
    await expect(line.getByText(u.foundAnother)).toHaveCount(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // 11 (US1 AC5): after he buys it, the store admits it found another one.
    await page.goto("/checkout");
    await visible(page.getByLabel("Card number")).fill("4242 4242 4242 4242");
    await visible(page.getByLabel("Expiry (MM/YY)")).fill("12/29");
    await visible(page.getByLabel("CVC")).fill("123");
    await visible(page.getByRole("button", { name: /Place order/ })).click();
    await expect(page).toHaveURL(/\/orders\/\d+$/);
    await page.goto("/shirts/geo-riot");
    await expect(visible(page.getByTestId("stock-line"))).toHaveText(u.again);
    await page.goto("/shirts");
    await expect(card("Geo Riot")).toHaveText(u.again);
    await expect(card("Fractal Fury")).toHaveText(u.scarce);
  });
});
