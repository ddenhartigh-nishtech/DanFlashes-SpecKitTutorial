import { expect } from "@playwright/test";
import { test, visible } from "../helpers";
import { consoleMessage, field, signInAsOwner, unique } from "./helpers";

test.describe("US3 — priced against the grain (FR-018–FR-021, SC-006)", () => {
  test("an inverted pair is caught, linked, and cleared once it's fixed", async ({
    page,
  }, info) => {
    test.slow();
    const id = unique(info.project.name);
    const name = `Grain ${id}`;
    await signInAsOwner(page);

    // A score-60 shirt priced at $50.00: cheaper than every simpler shirt on the floor.
    await page.goto("/admin/shirts/new");
    await field(page, "Name").fill(name);
    await field(page, "URL name").fill(`grain-${id}`);
    await field(page, "Complexity score").fill("60");
    await field(page, "Final price").fill("50");
    await field(page, "Description").fill("Suspiciously affordable.");
    await field(page, "Main picture", false).selectOption({ index: 1 });
    await page.getByLabel("Put it on the floor right away").check();
    await visible(page.getByRole("button", { name: "Save" })).click();
    await expect(page).toHaveURL(/\/admin\/shirts\/\d+/);
    const editUrl = page.url().replace(/\?.*$/, "");

    await page.goto("/admin/pricing");
    const chart = visible(page.getByTestId("price-chart"));
    await expect(chart).toBeVisible();
    // 010 FR-014: the MSRP is one straight segment on a linear axis from $0.
    await expect(chart.locator("path")).toHaveAttribute("d", /^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+$/);
    await expect(chart.getByText("$0", { exact: true })).toBeVisible();
    const pairs = visible(page.getByTestId("inversion")).filter({ hasText: name });
    expect(await pairs.count()).toBeGreaterThan(0);
    await expect(pairs.first().getByRole("link", { name })).toBeVisible();
    await expect(visible(page.getByTestId("override")).filter({ hasText: name })).toContainText(
      "below",
    );
    await expect(visible(page.getByTestId("audit"))).toBeVisible();

    // Fix it: back to the MSRP. The pair is gone.
    await page.goto(editUrl);
    await field(page, "Final price").fill("");
    await visible(page.getByRole("button", { name: "Save" })).click();
    await expect(consoleMessage(page)).toHaveText("Saved. That was a good decision, Dan.");
    await page.goto("/admin/pricing");
    await expect(visible(page.getByTestId("inversion")).filter({ hasText: name })).toHaveCount(0);
  });
});
