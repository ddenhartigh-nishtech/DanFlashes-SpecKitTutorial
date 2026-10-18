import { expect, type Page } from "@playwright/test";
import { addShirt, test, visible } from "../helpers";
import { consoleMessage, signInAsOwner, unique } from "./helpers";

const saved = "Saved. That was a good decision, Dan.";
const row = (page: Page, i: number) => visible(page.getByTestId("tier-row")).nth(i);
const inRow = (page: Page, i: number, label: string) =>
  row(page, i).getByLabel(label, { exact: true });

async function saveTiers(page: Page) {
  await visible(page.getByRole("button", { name: "Save the tiers" })).click();
  await expect(consoleMessage(page)).toHaveText(saved);
}

test.describe("US5 — tiers and add-ons (FR-027–FR-031)", () => {
  test("a tier added and removed, a tagline the store shows, BLAND locked", async ({
    page,
  }, info) => {
    test.slow();
    const id = unique(info.project.name);
    await signInAsOwner(page);
    await page.goto("/admin/tiers");

    // FR-029: BLAND's name and start can't be touched, and it has no Remove.
    await expect(inRow(page, 0, "Name")).toHaveValue("BLAND");
    await expect(inRow(page, 0, "Name")).toBeDisabled();
    await expect(inRow(page, 0, "Starts at score")).toBeDisabled();
    await expect(row(page, 0).getByRole("button", { name: "Remove" })).toHaveCount(0);

    // FR-028: a new tier far above every shirt: the preview says nothing moves.
    const before = await visible(page.getByTestId("tier-row")).count();
    await visible(page.getByRole("button", { name: "Add a tier" })).click();
    await inRow(page, before, "Name").fill(`E2E ${id}`);
    await inRow(page, before, "Starts at score").fill("50000");
    await expect(visible(page.getByTestId("tier-preview"))).toContainText("No shirt changes tier");
    await saveTiers(page);
    await expect(visible(page.getByTestId("tier-row"))).toHaveCount(before + 1);
    await row(page, before).getByRole("button", { name: "Remove" }).click();
    await saveTiers(page);
    await expect(visible(page.getByTestId("tier-row"))).toHaveCount(before);

    // FR-028, FR-011: Complicated's tagline reaches the store, then goes back.
    const complicated = visible(page.getByTestId("tier-row")).filter({
      has: page.locator('input[value="Complicated"]'),
    });
    const tagline = complicated.getByLabel("Tagline", { exact: true });
    const original = await tagline.inputValue();
    await tagline.fill(`Calmly complicated ${id}`);
    await saveTiers(page);
    await page.goto("/shirts/geo-riot");
    await expect(visible(page.getByText(`Calmly complicated ${id}`))).toBeVisible();
    await page.goto("/admin/tiers");
    await visible(page.getByTestId("tier-row"))
      .filter({ has: page.locator('input[value="Complicated"]') })
      .getByLabel("Tagline", { exact: true })
      .fill(original);
    await saveTiers(page);
  });

  test("an add-on created, offered at checkout, moved, and retired", async ({ page }, info) => {
    test.slow();
    const id = unique(info.project.name);
    const name = `Calm Coverage ${id}`;
    await signInAsOwner(page);
    await page.goto("/admin/add-ons");

    const create = visible(page.getByTestId("add-on-create"));
    await create.getByLabel("Name", { exact: true }).fill(name);
    await create.getByLabel("Pitch", { exact: true }).fill("Peace of mind, by the shape.");
    await create.getByLabel("Decline line", { exact: true }).fill("No thanks, I'll worry.");
    await create.getByLabel("Price", { exact: true }).fill("9.99");
    await create.getByRole("button", { name: "Add it" }).click();
    const mine = visible(page.locator(`[data-testid="add-on-row"][data-name="${name}"]`));
    await expect(mine).toHaveCount(1);

    // Checkout offers it, pre-ticked, like every add-on (005).
    await addShirt(page, "geo-riot", "L");
    await page.goto("/checkout");
    await expect(visible(page.getByTestId("add-on")).filter({ hasText: name })).toHaveCount(1);

    // FR-031: reorder: the first add-on moves down, then back.
    await page.goto("/admin/add-ons");
    const rows = visible(page.getByTestId("add-on-row"));
    const first = await rows.first().getAttribute("data-name");
    await rows.first().getByRole("button", { name: "Move down" }).click();
    await expect(rows.nth(1)).toHaveAttribute("data-name", first!);
    await rows.nth(1).getByRole("button", { name: "Move up" }).click();
    await expect(rows.first()).toHaveAttribute("data-name", first!);

    // FR-031: retired, never deleted; checkout stops offering it.
    await mine.getByRole("button", { name: "Retire" }).click();
    await expect(mine.getByTestId("add-on-status")).toHaveText("Retired");
    await page.goto("/checkout");
    await expect(visible(page.getByTestId("total"))).toBeVisible();
    await expect(page.getByTestId("add-on").filter({ hasText: name })).toHaveCount(0);
  });
});
