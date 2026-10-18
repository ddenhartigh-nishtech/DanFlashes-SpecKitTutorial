import { expect } from "@playwright/test";
import { DEMO_SHOPPER } from "../../../scripts/seed-data";
import { copy } from "../../../src/lib/copy";
import { pushPopsAway, signUp, test, uniqueEmail, visible } from "../helpers";
import { consoleMessage, signInAsOwner } from "./helpers";

test.describe("US6 — who's buying (FR-032–FR-036, SC-010)", () => {
  test("the owner finds a shopper, grants $500.00, and the shopper sees Dan's gift", async ({
    page,
    browser,
  }, info) => {
    test.slow(); // a real sign-up, two browsers
    const email = uniqueEmail(info.project.name);
    const shopper = await (
      await browser.newContext({ baseURL: info.project.use.baseURL })
    ).newPage();
    await pushPopsAway(shopper);
    await shopper.goto("/sign-up");
    await signUp(shopper, email);
    await expect(shopper).toHaveURL(/\/account$/, { timeout: 30_000 });

    // FR-032: found by search.
    await signInAsOwner(page);
    await page.goto(`/admin/customers?q=${encodeURIComponent(email)}`);
    const rows = visible(page.getByTestId("customer"));
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("$0.00");
    await rows.first().getByRole("link").first().click();
    await expect(page).toHaveURL(/\/admin\/customers\/\d+$/);

    // FR-036: a grant, recorded once even when the button is pressed twice.
    const grant = visible(page.getByTestId("grant-form"));
    await grant.getByLabel("Amount", { exact: true }).fill("500");
    await grant.getByRole("button", { name: "Grant" }).dblclick();
    await expect(consoleMessage(page)).toContainText("Granted $500.00");
    await expect(
      visible(page.getByTestId("ledger-entry")).filter({ hasText: "$500.00" }),
    ).toHaveCount(1);
    await expect(visible(page.getByTestId("customer-balance"))).toHaveText("$500.00");

    // The shopper's own history shows it, in the store's voice.
    await shopper.reload();
    await expect(visible(shopper.getByText(copy.account.entryGrant))).toBeVisible();
    await expect(visible(shopper.getByTestId("flash-entry"))).toHaveCount(1);
    await shopper.context().close();
  });

  test("an order shows the score it was bought at, and only the card's brand and last four", async ({
    page,
  }) => {
    await signInAsOwner(page);
    await page.goto(`/admin/customers?q=${encodeURIComponent(DEMO_SHOPPER.email)}`);
    await visible(page.getByTestId("customer")).first().getByRole("link").first().click();
    await visible(page.getByTestId("customer-order")).first().getByRole("link").first().click();
    await expect(page).toHaveURL(/\/admin\/orders\/\d+$/);
    await expect(visible(page.getByTestId("order-payment"))).toHaveText(/Visa ending 4242/);
    await expect(
      visible(page.getByTestId("order-line")).first().getByTestId("line-score"),
    ).toHaveText(/^\d+$/);
    await expect(page.getByText("4242 4242")).toHaveCount(0);
  });
});
