import { expect, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { test, visible } from "./helpers";

/** Click a main-nav link the way a shopper would: phones open the Menu first. */
async function clickNav(page: Page, name: string) {
  const menu = page.locator("summary", { hasText: "Menu" });
  if (await menu.isVisible()) await menu.click();
  await visible(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name })).click();
}

test.describe("header", () => {
  test("reads About, Shirts, Account, then the cart icon; the logo goes home", async ({ page }) => {
    await page.goto("/shirts");
    const menu = page.locator("summary", { hasText: "Menu" });
    if (await menu.isVisible()) await menu.click();
    const nav = visible(page.getByRole("navigation", { name: "Main" }));
    await expect(nav.getByRole("link")).toHaveText(["About", "Shirts", "Account"]);
    await expect(page.getByRole("link", { name: "Home", exact: true })).toHaveCount(0);

    const cart = visible(page.getByTestId("cart-link"));
    await expect(cart).toHaveAccessibleName(/^Cart/);
    await expect(cart.locator("svg")).toBeVisible();

    // The neon glow is the icon's own color, so on hover both turn yellow together.
    const glow = () =>
      cart.locator("svg").evaluate((svg) => {
        const style = getComputedStyle(svg);
        return { color: style.color, filter: style.filter };
      });
    const resting = await glow();
    expect(resting.filter).toContain(resting.color);
    if (!(await page.locator("summary", { hasText: "Menu" }).isVisible())) {
      await cart.hover();
      await expect.poll(async () => (await glow()).color).not.toBe(resting.color);
      const hovered = await glow();
      expect(hovered.filter).toContain(hovered.color);
      expect(hovered.filter).not.toContain(resting.color);
    }
    await cart.click();
    await expect(page).toHaveURL(/\/cart$/);

    await visible(page.getByRole("link", { name: copy.brand.name })).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("US3 — About Dan", () => {
  for (const from of ["/", "/shirts/geo-riot"]) {
    test(`About is one click from ${from}`, async ({ page }) => {
      await page.goto(from);
      await clickNav(page, copy.nav.about);
      await expect(page).toHaveURL(/\/about$/);
      await expect(visible(page.getByRole("heading", { level: 1 }))).toHaveText(copy.about.heading);
    });
  }

  test("Dan explains himself, then rests his case on Exhibit A", async ({ page }, info) => {
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/about");
    for (const section of copy.about.sections) {
      await expect(
        visible(page.getByRole("heading", { level: 2, name: section.heading })),
      ).toBeVisible();
    }

    const exhibit = visible(page.getByTestId("exhibit-a"));
    await expect(exhibit.getByRole("heading", { name: copy.about.exhibitA.heading })).toBeVisible();
    const card = exhibit.getByTestId("shirt-card");
    await expect(card).toContainText("Dan's Masterpiece");
    await expect(card.getByTestId("tier-badge")).toHaveText("Too Complicated for Most Men");
    await expect(card.getByTestId("price")).toHaveText("$1,228,800.00");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await card.getByRole("link").click();
    await expect(page).toHaveURL(/\/shirts\/dans-masterpiece$/);
  });
});
