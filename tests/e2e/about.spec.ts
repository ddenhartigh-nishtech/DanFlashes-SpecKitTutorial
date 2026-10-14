import { expect, test, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { visible } from "./helpers";

/** Click a main-nav link the way a shopper would: phones open the Menu first. */
async function clickNav(page: Page, name: string) {
  const menu = page.locator("summary", { hasText: "Menu" });
  if (await menu.isVisible()) await menu.click();
  await visible(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name })).click();
}

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
