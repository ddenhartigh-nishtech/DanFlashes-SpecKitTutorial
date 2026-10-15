import { expect, test } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { signUp, uniqueEmail, visible } from "./helpers";

test.describe("account sections", () => {
  test("Flash Credit, Revenue Streams and Purchase history collapse at their headers", async ({
    page,
  }, info) => {
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);

    for (const [id, heading, content] of [
      ["#flash-credit", copy.account.flashHeading, page.getByTestId("flash-balance")],
      ["#revenue-streams", copy.streams.heading, page.getByText(copy.streams.empty)],
      ["#purchase-history", copy.account.ordersHeading, page.getByText(copy.account.noOrders)],
    ] as const) {
      const section = visible(page.locator(id));
      const header = section.locator("summary");
      await expect(header.getByRole("heading", { name: heading })).toBeVisible();
      await expect(section).toHaveAttribute("open", "");
      await expect(header.getByTestId("section-indicator")).toBeVisible();
      await expect(visible(content)).toBeVisible();

      await header.click();
      await expect(section).not.toHaveAttribute("open");
      await expect(content.filter({ visible: true })).toHaveCount(0);

      await header.click();
      await expect(section).toHaveAttribute("open", "");
      await expect(visible(content)).toBeVisible();
    }
  });
});
