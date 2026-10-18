import { expect } from "@playwright/test";
import { awesomeButton, test, visible } from "../helpers";
import { CONSOLE_PAGES, field, poster, signInAsOwner, unique } from "./helpers";

const LOUD = [
  "pipes",
  "purchase-pop",
  "countdown",
  "stock-line",
  "social-proof",
  "drain-corner",
  "extreme-awesomeness",
] as const;

test.describe("US1 — the back office is calm (FR-005, FR-005a, FR-037, SC-011)", () => {
  test("with Extreme Awesomeness on, nothing in the office flashes, moves or pops up", async ({
    page,
  }) => {
    test.slow(); // every console page, twice
    await signInAsOwner(page);
    await page.goto("/");
    await awesomeButton(page).click();
    await expect(page.locator("html")).toHaveAttribute("data-awesome", "on");

    for (const path of CONSOLE_PAGES) {
      await page.goto(path);
      await expect(page.locator(".office"), path).toBeVisible();
      await expect(page.locator("html"), path).not.toHaveAttribute("data-awesome");
      for (const id of LOUD) await expect(page.getByTestId(id), `${path} ${id}`).toHaveCount(0);
      expect(await page.evaluate(() => document.getAnimations().length), path).toBe(0);
      await expect(poster(page), path).toHaveCount(1);

      // FR-005a: a different poster on every load.
      const first = await poster(page).getAttribute("data-poster");
      await page.reload();
      await expect(poster(page)).toHaveCount(1);
      expect(await poster(page).getAttribute("data-poster"), path).not.toBe(first);
    }
  });

  test("every console page fits a 360px phone with no sideways scrolling", async ({
    page,
  }, info) => {
    test.slow();
    await page.setViewportSize({ width: 360, height: 780 });
    await signInAsOwner(page);

    // A score with no ceiling (converge T068): score 9000 prices at ~274 digits. Resting, so the
    // store never shows it, but the console lists it and its editor previews it.
    const id = unique(info.project.name);
    await page.goto("/admin/shirts/new");
    await field(page, "Name").fill(`Endless ${id}`);
    await field(page, "URL name").fill(`endless-${id}`);
    await field(page, "Complexity score").fill("9000");
    await field(page, "Description").fill("It just keeps going.");
    await visible(page.getByRole("button", { name: "Save" })).click();
    await expect(page).toHaveURL(/\/admin\/shirts\/\d+/);
    const huge = new URL(page.url()).pathname;

    for (const path of [...CONSOLE_PAGES, huge]) {
      await page.goto(path);
      await expect(page.locator(".office"), path).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
