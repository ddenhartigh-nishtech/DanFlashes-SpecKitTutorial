import { expect, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { addShirt, test, visible } from "./helpers";

const r = copy.roachMotel;
const labels = copy.shame.labels;

const dialog = (page: Page) => visible(page.getByTestId("roach-motel"));

test.describe("US2 — roach-motel cart", () => {
  test("shirts check in with one click, and don't check out without two yeses", async ({
    page,
  }, info) => {
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });

    // 12: adding asks nothing.
    await addShirt(page, "geo-riot", "M");
    await expect(page.getByTestId("roach-motel").filter({ visible: true })).toHaveCount(0);
    await page.goto("/cart");
    const line = visible(page.getByTestId("cart-line")).filter({ hasText: "Geo Riot" });
    const remove = line.getByRole("button", { name: labels.remove.shamed });

    // 8: the first question; Keep leaves the line.
    await remove.click();
    await expect(dialog(page)).toContainText(r.first);
    await expect(dialog(page).getByRole("button", { name: r.keep })).toBeFocused();
    await dialog(page).getByRole("button", { name: r.keep }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(line).toHaveCount(1);

    // 13: it fits a phone, with no sideways scroll.
    await remove.click();
    const box = (await dialog(page).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // 9: yes, then Keep at "Are you sure sure?", still leaves it.
    await dialog(page).getByRole("button", { name: labels.removeYes.shamed }).click();
    await expect(dialog(page)).toContainText(r.second);
    await dialog(page).getByRole("button", { name: r.keep }).click();
    await expect(line).toHaveCount(1);

    // Escape is a keep too.
    await remove.click();
    await expect(dialog(page)).toContainText(r.first);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
    await expect(line).toHaveCount(1);

    // 11: raising asks nothing; lowering asks twice, and Keep leaves the quantity as it was.
    const qty = line.getByLabel(copy.cart.quantity);
    const update = line.getByRole("button", { name: copy.cart.update });
    await qty.fill("3");
    await update.click();
    await expect(line.getByTestId("stock-line")).toHaveText(copy.urgency.fewMore);
    await expect(dialog(page)).toHaveCount(0);
    await qty.fill("2");
    await update.click();
    await expect(dialog(page)).toContainText(r.first);
    await dialog(page).getByRole("button", { name: labels.lowerYes.shamed }).click();
    await expect(dialog(page)).toContainText(r.second);
    await dialog(page).getByRole("button", { name: r.keep }).click();
    await expect(qty).toHaveValue("3");
    await qty.fill("2");
    await update.click();
    await dialog(page).getByRole("button", { name: labels.lowerYes.shamed }).click();
    await dialog(page).getByRole("button", { name: labels.lowerYes.shamed }).click();
    await expect(line.getByTestId("price")).toHaveText("$700.00");
    await expect(qty).toHaveValue("2");

    // 10: two yeses, and it's finally gone.
    await remove.click();
    await dialog(page).getByRole("button", { name: labels.removeYes.shamed }).click();
    await dialog(page).getByRole("button", { name: labels.removeYes.shamed }).click();
    await expect(visible(page.getByTestId("empty-cart"))).toBeVisible();
  });
});
