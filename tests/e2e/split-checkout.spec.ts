import { expect } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { addShirt, signUp, test, uniqueEmail, visible } from "./helpers";

const c = copy.checkout;

test.describe("US3 — split the bill", () => {
  test("apply credit, see the split, remove it, confirm it, pay the rest by card", async ({
    page,
  }, info) => {
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);

    // $100.00 of Flash Credit against Geo Riot ($344.61).
    await visible(page.getByLabel(copy.account.customAmount)).fill("100.00");
    await visible(page.getByLabel("Card number")).first().fill("4242 4242 4242 4242");
    await visible(page.getByLabel("Expiry (MM/YY)")).first().fill("12/29");
    await visible(page.getByLabel("CVC")).first().fill("123");
    await visible(page.getByRole("button", { name: copy.account.topUp })).click();
    await expect(visible(page.getByTestId("flash-balance"))).toHaveText("$100.00");

    await addShirt(page, "geo-riot", "M");
    await page.goto("/checkout");
    await visible(page.getByRole("button", { name: c.applyCredit("$100.00") })).click();
    const split = visible(page.getByTestId("split"));
    await expect(split.getByTestId("credit-line")).toHaveText(c.creditLine("$100.00"));
    await expect(split.getByTestId("card-line")).toHaveText(c.cardLine("$244.61"));

    // The rest needs a card and his say-so: unconfirmed, nothing is placed.
    const confirm = visible(page.getByLabel(c.confirmSplit("$244.61")));
    await expect(confirm).not.toBeChecked();
    await visible(page.getByLabel("Card number")).fill("4242 4242 4242 4242");
    await visible(page.getByLabel("Expiry (MM/YY)")).fill("12/29");
    await visible(page.getByLabel("CVC")).fill("123");
    await visible(page.getByRole("button", { name: /Place order/ })).click();
    await expect(page).toHaveURL(/\/checkout$/);

    // Changed his mind: Remove puts it all back on the card.
    await split.getByRole("button", { name: c.removeCredit }).click();
    await expect(visible(page.getByTestId("split"))).toHaveCount(0);
    await expect(page.getByLabel(c.confirmSplit("$244.61"))).toHaveCount(0);

    // Apply again, confirm, pay.
    await visible(page.getByRole("button", { name: c.applyCredit("$100.00") })).click();
    await visible(page.getByLabel(c.confirmSplit("$244.61"))).check();
    await visible(page.getByLabel("Card number")).fill("4242 4242 4242 4242");
    await visible(page.getByLabel("Expiry (MM/YY)")).fill("12/29");
    await visible(page.getByLabel("CVC")).fill("123");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await visible(page.getByRole("button", { name: /Place order/ })).click();
    await expect(page).toHaveURL(/\/orders\/\d+$/);
    await expect(visible(page.getByTestId("payment"))).toHaveText(
      copy.order.paidSplit("$100.00", "Visa", "4242", "$244.61"),
    );
    const orderPath = new URL(page.url()).pathname;

    // Exactly the credit came off, linked to the order.
    await page.goto("/account");
    await expect(visible(page.getByTestId("flash-balance"))).toHaveText("$0.00");
    const spend = visible(page.getByTestId("flash-entry")).first();
    await expect(spend).toContainText("-$100.00");
    await expect(spend.getByRole("link")).toHaveAttribute("href", orderPath);
  });
});
