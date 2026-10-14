import { expect, test } from "@playwright/test";
import { addShirt, visible } from "./helpers";

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

    // Bug fix (2026-10-13): the quantity box only takes 1–99; a negative never submits.
    const qty = line.getByLabel("Qty");
    await expect(qty).toHaveAttribute("min", "1");
    await qty.fill("-2");
    await line.getByRole("button", { name: "Update" }).click();
    await expect(line.getByTestId("price")).toHaveText("$344.61");
    expect(await qty.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);

    // Quantity update re-prices the line exactly.
    await line.getByLabel("Qty").fill("3");
    await line.getByRole("button", { name: "Update" }).click();
    await expect(line.getByTestId("price")).toHaveText("$1,033.83");

    // Remove empties the cart and brings back the pitch.
    await line.getByRole("button", { name: "Remove (and lose your edge)" }).click();
    await expect(visible(page.getByTestId("empty-cart"))).toBeVisible();
  });

  test("clicking the shirt enhances it, like ENHANCE; dragging only pans", async ({ page }) => {
    await page.goto("/shirts/geo-riot");
    const frame = visible(page.getByTestId("zoom-frame"));
    await expect(frame).toHaveAttribute("data-scale", "1.00");
    // Retry only until hydration attaches the handler; a click before that does nothing.
    await expect(async () => {
      await frame.click();
      await expect(frame).not.toHaveAttribute("data-scale", "1.00", { timeout: 1_000 });
    }).toPass();
    await expect(frame).toHaveAttribute("data-scale", "1.50");
    await frame.click();
    await expect(frame).toHaveAttribute("data-scale", "2.25");

    const box = (await frame.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 6 });
    await page.mouse.up();
    await expect(frame).toHaveAttribute("data-scale", "2.25");
  });

  test("a huge subtotal stays inside its box", async ({ page }) => {
    await addShirt(page, "dans-masterpiece", "XL");
    await page.goto("/cart");
    const line = visible(page.getByTestId("cart-line"));
    await line.getByLabel("Qty").fill("99");
    await line.getByRole("button", { name: "Update" }).click();
    const summary = visible(page.getByTestId("cart-summary"));
    await expect(summary.getByTestId("price")).toHaveText("$121,651,200.00");
    const spill = await summary.evaluate((box) => {
      const outer = box.getBoundingClientRect();
      return [...box.querySelectorAll("*")].some((el) => {
        const r = el.getBoundingClientRect();
        return r.right > outer.right + 0.5 || r.left < outer.left - 0.5;
      });
    });
    expect(spill).toBe(false);
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
