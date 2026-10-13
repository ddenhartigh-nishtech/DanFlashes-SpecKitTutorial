import { expect, test } from "@playwright/test";
import { visible } from "./helpers";

test.describe("US2 — zoom, enhance, add to cart", () => {
  test("empty cart pitches the most expensive shirt", async ({ page }) => {
    await page.goto("/cart");
    const empty = visible(page.getByTestId("empty-cart"));
    await expect(empty.getByRole("heading", { name: "You sure about that?" })).toBeVisible();
    await expect(visible(page.getByTestId("spotlight"))).toContainText("Dan's Masterpiece");
    await expect(
      empty.getByRole("link", { name: "Show me the most complicated shirts" }),
    ).toHaveAttribute("href", /\/shirts\?tier=\d+&sort=price-desc/);
  });

  test("zoom, refuse a missing size, add size L, then manage the cart", async ({ page }) => {
    await page.goto("/shirts/geo-riot");
    await expect(visible(page.getByRole("heading", { level: 1, name: "Geo Riot" }))).toBeVisible();

    // ENHANCE changes the scale; reset brings it back.
    const frame = visible(page.getByTestId("zoom-frame"));
    await expect(frame).toHaveAttribute("data-scale", "1.00");
    await visible(page.getByRole("button", { name: "ENHANCE" })).click();
    await expect(frame).toHaveAttribute("data-scale", "1.50");
    await visible(page.getByRole("button", { name: "Reset" })).click();
    await expect(frame).toHaveAttribute("data-scale", "1.00");

    // No size → refused.
    await visible(page.getByRole("button", { name: "Add to cart" })).click();
    await expect(
      visible(page.getByText("Pick a size. Even complicated men have measurements.")),
    ).toBeVisible();

    // Size L → added, and the header count updates.
    await page.locator("label").filter({ hasText: /^L$/ }).click();
    await visible(page.getByRole("button", { name: "Add to cart" })).click();
    await expect(visible(page.getByText("It's in the cart. Excellent decision."))).toBeVisible();
    // On phones the count lives in the collapsed menu — open it like a shopper would.
    const menu = page.locator("summary", { hasText: "Menu" });
    if (await menu.isVisible()) await menu.click();
    await expect(visible(page.getByTestId("cart-count")).first()).toHaveText("1");

    await page.goto("/cart");
    const line = visible(page.getByTestId("cart-line"));
    await expect(line).toHaveCount(1);
    await expect(line).toContainText("Geo Riot");
    await expect(line).toContainText("Size L");
    await expect(line.getByTestId("tier-badge")).toHaveText("Complicated");
    await expect(line.getByTestId("price")).toHaveText("$344.61");

    // Quantity update re-prices the line exactly.
    await line.getByLabel("Qty").fill("3");
    await line.getByRole("button", { name: "Update" }).click();
    await expect(line.getByTestId("price")).toHaveText("$1,033.83");

    // Remove empties the cart and brings back the pitch.
    await line.getByRole("button", { name: "Remove" }).click();
    await expect(visible(page.getByTestId("empty-cart"))).toBeVisible();
  });

  test("a retired shirt shows no price and no Add to cart", async ({ page }) => {
    await page.goto("/shirts/last-seasons-swirl");
    await expect(visible(page.getByTestId("retired-banner"))).toContainText(
      "Retired from the floor",
    );
    await expect(visible(page.getByTestId("price"))).toHaveCount(0);
    await expect(visible(page.getByRole("button", { name: "Add to cart" }))).toHaveCount(0);
  });
});
