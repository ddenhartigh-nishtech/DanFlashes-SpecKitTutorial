import { expect } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { addShirt, signUp, test, uniqueEmail, visible } from "./helpers";

const c = copy.checkout;

test.describe("US1 — pre-checked add-ons", () => {
  test("everything's ticked, every time; the total and the order carry exactly what he kept", async ({
    page,
  }, info) => {
    test.slow(); // a sign-up, a top-up, a split checkout and the history: more than 60 s on a busy machine
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);

    // $100.00 of Flash Credit for the split later.
    await visible(page.getByLabel(copy.account.customAmount)).fill("100.00");
    await visible(page.getByLabel("Card number")).first().fill("4242 4242 4242 4242");
    await visible(page.getByLabel("Expiry (MM/YY)")).first().fill("12/29");
    await visible(page.getByLabel("CVC")).first().fill("123");
    await visible(page.getByRole("button", { name: copy.account.topUp })).click();
    await expect(visible(page.getByTestId("flash-balance"))).toHaveText("$100.00");

    // Quickstart 1: all four, already ticked, already in the total.
    await addShirt(page, "geo-riot", "M");
    await page.goto("/checkout");
    const addOns = visible(page.getByTestId("add-on"));
    await expect(addOns).toHaveCount(4);
    for (const box of await visible(page.getByRole("checkbox", { name: /\$\d/ })).all()) {
      await expect(box).toBeChecked();
    }
    const total = visible(page.getByTestId("total"));
    await expect(total).toHaveText("$539.96");

    // 2: untick, and Dan says something; tick again, and it's back.
    const insurance = visible(page.getByRole("checkbox", { name: /Complexity Insurance/ }));
    const decline = "No thanks, I'll take my chances with complexity.";
    await insurance.uncheck();
    await expect(total).toHaveText("$449.97");
    await expect(visible(page.getByText(decline))).toBeVisible();
    await insurance.check();
    await expect(total).toHaveText("$539.96");
    await expect(page.getByText(decline).filter({ visible: true })).toHaveCount(0);

    // 3: unticks don't stick.
    await insurance.uncheck();
    await visible(page.getByRole("checkbox", { name: /Extended Vibrancy Warranty/ })).uncheck();
    await page.reload();
    await expect(visible(page.getByTestId("total"))).toHaveText("$539.96");
    await expect(
      visible(page.getByRole("checkbox", { name: /Complexity Insurance/ })),
    ).toBeChecked();
    // Nor a trip to the cart and back: Next keeps the page he left mounted, just hidden.
    await visible(page.getByRole("checkbox", { name: /Complexity Insurance/ })).uncheck();
    await expect(visible(page.getByTestId("total"))).toHaveText("$449.97");
    await visible(page.getByTestId("cart-link")).click();
    await expect(page).toHaveURL(/\/cart$/);
    await visible(page.getByRole("link", { name: copy.cart.checkout, exact: true })).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(visible(page.getByTestId("total"))).toHaveText("$539.96");
    await expect(
      visible(page.getByRole("checkbox", { name: /Complexity Insurance/ })),
    ).toBeChecked();

    // 5 (US1 AC4): untick the protection plan and split the rest: credit plus card, add-ons included.
    await visible(page.getByRole("checkbox", { name: /Pattern Protection Plan/ })).uncheck();
    await expect(visible(page.getByTestId("total"))).toHaveText("$489.97");
    await visible(page.getByRole("button", { name: c.applyCredit("$100.00") })).click();
    await expect(visible(page.getByTestId("card-line"))).toHaveText(c.cardLine("$389.97"));
    await visible(page.getByLabel(c.confirmSplit("$389.97"))).check();
    await visible(page.getByLabel("Card number")).fill("4242 4242 4242 4242");
    await visible(page.getByLabel("Expiry (MM/YY)")).fill("12/29");
    await visible(page.getByLabel("CVC")).fill("123");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await visible(page.getByRole("button", { name: /Place order/ })).click();
    await expect(page).toHaveURL(/\/orders\/\d+$/, { timeout: 30_000 });

    // The confirmation and the history list each add-on he kept, at the price he paid.
    const lines = visible(page.getByTestId("add-on-line"));
    await expect(lines).toHaveCount(3);
    await expect(lines.filter({ hasText: "Complexity Insurance" })).toContainText("$89.99");
    await expect(lines.filter({ hasText: "Pattern Protection Plan" })).toHaveCount(0);
    await expect(visible(page.getByTestId("payment"))).toHaveText(
      copy.order.paidSplit("$100.00", "Visa", "4242", "$389.97"),
    );
    await page.goto("/account");
    await expect(visible(page.getByTestId("add-on-line"))).toHaveCount(3);
  });
});
