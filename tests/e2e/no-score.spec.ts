import { expect, test, type Page } from "@playwright/test";
import { addShirt, signUp, uniqueEmail, visible } from "./helpers";

/**
 * SC-003: shoppers never see a complexity score — not in the visible text, and not in the
 * serialized React payload that ships with the HTML.
 */
async function expectNoScore(page: Page, where: string) {
  await page.waitForLoadState("networkidle");
  const html = await page.content();
  expect(html, `${where}: payload carries a complexity field`).not.toContain('"complexity"');
  expect(html, `${where}: payload carries an MSRP`).not.toContain('"msrpUsd"');
  const text = await page.locator("body").innerText();
  expect(text, `${where}: visible text mentions a score`).not.toMatch(/\bcomplexity\b|\bscore\b/i);
}

test("no shopper-facing page reveals a complexity score", async ({ page }, info) => {
  for (const path of ["/", "/shirts", "/shirts/geo-riot", "/shirts/last-seasons-swirl", "/cart"]) {
    await page.goto(path);
    await expectNoScore(page, path);
  }

  await addShirt(page, "dans-masterpiece", "M");
  await page.goto("/cart");
  await expectNoScore(page, "/cart (with a line)");

  await page.goto("/checkout"); // gate → sign-in
  await expect(page).toHaveURL(/\/sign-in/);
  await expectNoScore(page, "/sign-in");
  await page.goto("/sign-up?next=/checkout");
  await signUp(page, uniqueEmail(info.project.name));
  await expect(page).toHaveURL(/\/checkout$/);
  await expectNoScore(page, "/checkout");

  await visible(page.getByLabel("Card number")).fill("4242 4242 4242 4242");
  await visible(page.getByLabel("Expiry (MM/YY)")).fill("12/29");
  await visible(page.getByLabel("CVC")).fill("123");
  await visible(page.getByRole("button", { name: /Place order/ })).click();
  await expect(page).toHaveURL(/\/orders\/\d+$/);
  await expectNoScore(page, "/orders/[id]");

  await page.goto("/account");
  await expectNoScore(page, "/account");
});
