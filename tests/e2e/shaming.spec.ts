import { expect, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { addShirt, test, visible } from "./helpers";

/** The seed's active non-bland shirts, least to most complicated (the shaming ladder). */
const LADDER = [
  "Geo Riot",
  "Paisley Panic",
  "Hawaiian Tax Return",
  "Zigzag Zealot",
  "T.C. Tugger Belly Breather",
  "Mall Kiosk Majesty",
  "Fractal Fury",
  "Confetti Cannon",
  "Op-Art Overdrive",
  "Kaleidoscope Custody Battle",
  "The Per Diem",
  "Dan's Masterpiece",
];
const INSIST = "Yes, I'd rather blend in";

async function tryToBuyBeige(page: Page) {
  await page.goto("/shirts/beige-regret");
  await page.locator("label").filter({ hasText: /^S$/ }).click();
  await visible(page.getByRole("button", { name: "Add to cart" })).click();
  const dialog = visible(page.getByTestId("shame-dialog"));
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("US1 — You sure about that?", () => {
  test("the loop never ends, climbs the ladder, and never adds the bland shirt", async ({
    page,
  }, info) => {
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });
    const dialog = await tryToBuyBeige(page);
    await expect(dialog.getByRole("heading", { name: copy.shame.title })).toBeVisible();

    const pool = copy.shame.lines.length;
    const lines: string[] = [];
    for (let round = 1; round <= 21; round++) {
      await expect(dialog).toHaveAttribute("data-round", String(round));
      const expected = LADDER[Math.min(round, LADDER.length) - 1];
      await expect(dialog.getByTestId("shame-recommendation")).toContainText(expected);
      lines.push(await dialog.getByTestId("shame-line").innerText());
      if (round === 1 && info.project.name === "phone") {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      }
      if (round < 21) await dialog.getByRole("button", { name: INSIST }).click();
    }

    // Every line comes from the pool, and none repeats until the whole pool has been used.
    for (const line of lines) expect(copy.shame.lines).toContain(line);
    for (let start = 0; start < lines.length; start += pool) {
      const cycle = lines.slice(start, start + pool);
      expect(new Set(cycle).size).toBe(cycle.length);
    }
    for (let i = 1; i < lines.length; i++) expect(lines[i]).not.toBe(lines[i - 1]);

    // Escape just closes it: he stays put.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/shirts\/beige-regret$/);

    // Relenting sends him off to look at real shirts, and the listing works without a reload.
    await visible(page.getByRole("button", { name: "Add to cart" })).click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-round", "1");
    await dialog.getByRole("link", { name: copy.shame.relent }).click();
    await expect(page).toHaveURL(/\/shirts$/);
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await visible(page.getByTestId("shirt-card")).first().click();
    await expect(page).toHaveURL(/\/shirts\/[a-z0-9-]+$/);

    await page.goto("/cart");
    await expect(visible(page.getByTestId("empty-cart"))).toBeVisible();
  });

  test("taking the recommendation goes to the complicated shirt and adds nothing", async ({
    page,
  }) => {
    const dialog = await tryToBuyBeige(page);
    await dialog.getByRole("link", { name: copy.shame.takeIt }).click();
    await expect(page).toHaveURL(/\/shirts\/geo-riot$/);
    await expect(visible(page.getByRole("heading", { level: 1, name: "Geo Riot" }))).toBeVisible();
    await expect(page.locator("dialog[open]")).toHaveCount(0); // no invisible modal left behind

    // Nothing was added on the way, and the new page works without a reload.
    await visible(page.locator("label").filter({ hasText: /^M$/ })).click();
    await visible(page.getByRole("button", { name: "Add to cart" })).click();
    await expect(visible(page.getByText("It's in the cart. Excellent decision."))).toBeVisible();
    await visible(page.getByRole("link", { name: "View cart" })).click();
    await expect(page).toHaveURL(/\/cart$/);
    const lines = visible(page.getByTestId("cart-line"));
    await expect(lines).toHaveCount(1);
    await expect(lines).toContainText("Geo Riot");
  });

  test("a shirt with something going on adds in one click, as always", async ({ page }) => {
    await addShirt(page, "geo-riot", "M");
    await expect(visible(page.getByTestId("shame-dialog"))).toHaveCount(0);
  });
});
