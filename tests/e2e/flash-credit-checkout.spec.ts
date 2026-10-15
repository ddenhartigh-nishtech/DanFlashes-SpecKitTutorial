import { expect, test, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { addShirt, signUp, uniqueEmail, visible } from "./helpers";

const dollars = (text: string) => Number(text.replace(/[$,]/g, ""));

async function fillCard(page: Page) {
  await visible(page.getByLabel("Card number")).fill("4242 4242 4242 4242");
  await visible(page.getByLabel("Expiry (MM/YY)")).fill("12/29");
  await visible(page.getByLabel("CVC")).fill("123");
}

test.describe("US4 — Flash Credit", () => {
  test("top up $5,000, check out with Flash Credit, balance drops by exactly the total", async ({
    page,
  }, info) => {
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);
    await expect(visible(page.getByTestId("flash-balance"))).toHaveText("$0.00");

    // Load up.
    await page
      .locator("label")
      .filter({ hasText: /^\$5,000\.00$/ })
      .click();
    await fillCard(page);
    await visible(page.getByRole("button", { name: "Add Flash Credit" })).click();
    await expect(visible(page.getByTestId("flash-balance"))).toHaveText("$5,000.00");
    await expect(visible(page.getByTestId("flash-entry")).first()).toContainText(
      "Top-up from Visa ending 4242",
    );
    // FR-032: each entry shows its date.
    await expect(visible(page.getByTestId("flash-entry")).first().locator("time")).toHaveText(
      /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/,
    );

    // Spend it.
    await addShirt(page, "geo-riot", "L");
    await page.goto("/checkout");
    const total = dollars(await visible(page.getByTestId("total")).innerText());
    await visible(
      page.getByRole("button", { name: copy.checkout.applyCredit("$5,000.00") }),
    ).click();
    await expect(visible(page.getByTestId("split"))).toContainText(copy.checkout.coveredByCredit);
    await visible(page.getByRole("button", { name: /Place order/ })).click();
    await expect(page).toHaveURL(/\/orders\/\d+$/);
    await expect(visible(page.getByTestId("payment"))).toHaveText("Paid with Flash Credit");
    const orderPath = new URL(page.url()).pathname;

    // The balance dropped by exactly the total, and the spend links to the order.
    await page.goto("/account");
    const balance = dollars(await visible(page.getByTestId("flash-balance")).innerText());
    expect(Math.round((5000 - total) * 100)).toBe(Math.round(balance * 100));
    const spend = visible(page.getByTestId("flash-entry")).first();
    await expect(spend).toContainText("Spent on order DF-");
    await expect(spend.getByRole("link")).toHaveAttribute("href", orderPath);
  });

  test("with $0.00 of Flash Credit, checkout offers a top-up instead of Apply", async ({
    page,
  }, info) => {
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);

    await addShirt(page, "dans-masterpiece", "XL");
    await page.goto("/checkout");
    const prompt = visible(page.getByTestId("no-credit"));
    await expect(prompt).toContainText(copy.checkout.noCredit);
    await expect(prompt.getByRole("link", { name: copy.checkout.topUpLink })).toBeVisible();
    await expect(prompt.getByRole("link", { name: copy.checkout.streamsLink })).toBeVisible();
    await expect(page.getByRole("button", { name: /Apply my Flash Credit/ })).toHaveCount(0);
    await expect(visible(page.getByLabel("Card number"))).toBeVisible();
  });
});
