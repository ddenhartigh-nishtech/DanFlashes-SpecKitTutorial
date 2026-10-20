import { expect, type Page } from "@playwright/test";
import { test, visible } from "../helpers";
import { consoleMessage, field, signInAsOwner, unique } from "./helpers";

const saved = "Saved. That was a good decision, Dan.";

async function storePage(page: Page, slug: string) {
  await page.goto(`/shirts/${slug}`);
  await expect(visible(page.getByRole("heading", { level: 1 }))).toBeVisible();
}

test.describe("US1 — Dan's shirts (FR-006–FR-011)", () => {
  test("create, preview, put on the floor, refuse a bland price, deactivate, bring back", async ({
    page,
  }, info) => {
    test.slow(); // the console and the store, back and forth
    const id = unique(info.project.name);
    const slug = `e2e-${id}`;
    const name = `E2E Pattern ${id}`;
    await signInAsOwner(page);

    // FR-006: every shirt, with the number only Dan sees.
    await page.goto("/admin/shirts");
    const fury = visible(page.getByTestId("admin-shirt")).filter({ hasText: "Fractal Fury" });
    await expect(fury.getByTestId("score")).toHaveText(/^\d+$/);
    await expect(fury.getByTestId("tier-name")).not.toBeEmpty();

    // FR-007, FR-008: a new shirt, previewed as it's typed, saved inactive without an image.
    await visible(page.getByRole("link", { name: "New shirt" })).click();
    await field(page, "Name").fill(name);
    await field(page, "URL name").fill(slug);
    await field(page, "Style", false).selectOption("polo");
    // 010 FR-015: every whole score has a price, however complicated.
    await field(page, "Complexity score").fill("1000000");
    const preview = visible(page.getByTestId("price-preview"));
    await expect(preview).toContainText("$25,000,050.00");
    await field(page, "Complexity score").fill("30");
    await field(page, "Description").fill("Made by a robot, approved by Dan.");
    await expect(preview).toContainText("Very Complicated");
    await expect(preview).toContainText("$800.00");
    await visible(page.getByRole("button", { name: "Save" })).click();
    await expect(page).toHaveURL(/\/admin\/shirts\/\d+/);
    await expect(consoleMessage(page)).toHaveText(saved);
    await expect(visible(page.getByTestId("shirt-status"))).toHaveText(/resting/i);

    // FR-024, FR-011: a picture from the library, then onto the floor, and the store has it.
    const picture = field(page, "Add a picture", false);
    await picture.selectOption({ index: 1 });
    await visible(page.getByRole("button", { name: "Attach" })).click();
    await expect(visible(page.getByTestId("shirt-image"))).toHaveCount(1);
    await visible(page.getByRole("button", { name: "Put it on the floor" })).click();
    await expect(visible(page.getByTestId("shirt-status"))).toHaveText(/on the floor/i);
    const editUrl = page.url().replace(/\?.*$/, "");

    await storePage(page, slug);
    await expect(visible(page.getByRole("heading", { level: 1 }))).toHaveText(name);
    await expect(visible(page.getByText("$800.00").first())).toBeVisible();
    await expect(visible(page.getByTestId("tier-badge").first())).toHaveText(/Very Complicated/i);

    // FR-009: a bland score at $400.00 is refused, and nothing changes.
    await page.goto(editUrl);
    await field(page, "Complexity score").fill("5");
    await field(page, "Final price").fill("400");
    await visible(page.getByRole("button", { name: "Save" })).click();
    await expect(consoleMessage(page)).toContainText("$300.00");
    await expect(consoleMessage(page)).toContainText("$400.00");

    // FR-010: deactivate, asked once and calmly; the floor drops it, its page says retired.
    await page.goto(editUrl);
    await visible(page.getByRole("button", { name: "Deactivate" })).click();
    await expect(
      page.getByText(`Deactivate ${name}? You can bring it back any time.`),
    ).toBeVisible();
    await visible(page.getByRole("button", { name: "Yes, deactivate" })).click();
    await expect(visible(page.getByTestId("shirt-status"))).toHaveText(/resting/i);
    await page.goto("/shirts");
    await expect(page.getByText(name)).toHaveCount(0);
    await storePage(page, slug);
    await expect(visible(page.getByTestId("retired-banner"))).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0);

    // And back on the floor.
    await page.goto(editUrl);
    await visible(page.getByRole("button", { name: "Put it on the floor" })).click();
    await expect(visible(page.getByTestId("shirt-status"))).toHaveText(/on the floor/i);
    await storePage(page, slug);
    await expect(visible(page.getByRole("button", { name: "Add to cart" }))).toBeVisible();
  });

  test("a confirmation shows, goes away by itself, and shows again on the next save (owner, 2026-10-19)", async ({
    page,
  }) => {
    test.slow(); // two waits for a confirmation to go
    await signInAsOwner(page);
    await page.goto("/admin/shirts/1");
    const save = visible(page.getByRole("button", { name: "Save" }));
    for (let i = 0; i < 2; i++) {
      await save.click();
      await expect(consoleMessage(page)).toHaveText(saved);
      // Quietly, in place: no fade and no slide (constitution V, the back office is calm).
      await expect(page.getByTestId("console-message")).toHaveCount(0, { timeout: 10_000 });
    }

    // A refusal stays until he fixes it: it says what's wrong.
    await field(page, "Complexity score").fill("lots");
    await save.click();
    await expect(consoleMessage(page)).toHaveAttribute("data-ok", "false");
    await page.waitForTimeout(6_000);
    await expect(consoleMessage(page)).toHaveAttribute("data-ok", "false");
  });
});
