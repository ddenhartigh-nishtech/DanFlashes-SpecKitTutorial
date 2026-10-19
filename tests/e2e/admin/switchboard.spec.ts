import { expect, type Page } from "@playwright/test";
import { copy } from "../../../src/lib/copy";
import { addShirt, pushPopsAway, test, visible } from "../helpers";
import { consoleMessage, field, signInAsOwner } from "./helpers";

const c = copy.console.settings;
const sw = (page: Page, key: string) =>
  visible(page.locator(`[data-testid="switch"][data-key="${key}"]`));

test.describe("US2 — the switchboard (FR-012–FR-016, SC-005)", () => {
  test("every switch, one click each; the store follows; tuning previews; presets reach top-up", async ({
    page,
    browser,
  }, info) => {
    test.slow(); // the console, a guest's cart, and the owner's account page
    await signInAsOwner(page);

    // SC-005: from the office's front door, Settings, then the switch: two clicks.
    await page.goto("/admin");
    await visible(page.getByRole("link", { name: copy.console.nav.settings }))
      .first()
      .click();
    await expect(visible(page.getByTestId("switch"))).toHaveCount(15); // 007 added two: the pattern generator and the Uniquity Surcharge
    for (const [key, { label, description }] of Object.entries(c.switches)) {
      await expect(sw(page, key)).toContainText(label);
      await expect(sw(page, key)).toContainText(description);
    }
    const roach = sw(page, "roachMotel");
    await expect(roach.getByTestId("switch-state")).toHaveText(c.on);
    await roach.getByRole("button", { name: c.turnOff }).click();
    await expect(roach.getByTestId("switch-state")).toHaveText(c.off);

    // FR-013: the store follows on the next page load. A guest removes a line with no questions.
    const guest = await (await browser.newContext({ baseURL: info.project.use.baseURL })).newPage();
    await pushPopsAway(guest);
    await addShirt(guest, "geo-riot", "M");
    await guest.goto("/cart");
    const line = visible(guest.getByTestId("cart-line")).filter({ hasText: "Geo Riot" });
    await line.getByRole("button", { name: /^Remove/ }).click();
    await expect(guest.getByTestId("roach-motel").filter({ visible: true })).toHaveCount(0);
    await expect(line).toHaveCount(0);
    await guest.context().close();

    await roach.getByRole("button", { name: c.turnOn }).click();
    await expect(roach.getByTestId("switch-state")).toHaveText(c.on);

    // FR-014: a preview of every MSRP, now and after, before anything is saved.
    await field(page, c.tuning.start).fill("400");
    const fury = visible(page.getByTestId("tuning-row")).filter({ hasText: "Fractal Fury" });
    const now = await fury.getByTestId("msrp-now").innerText();
    await expect(fury.getByTestId("msrp-after")).not.toHaveText(now);
    await expect(fury.getByTestId("msrp-after")).toHaveText(/^\$[\d,]+\.\d{2}$/);

    // FR-016: a new preset reaches the top-up, then the old ones go back.
    const presets = field(page, c.presets.label);
    const original = await presets.inputValue();
    await presets.fill(`${original}\n2500`);
    await visible(page.getByRole("button", { name: c.presets.save })).click();
    await expect(consoleMessage(page).first()).toBeVisible();
    await page.goto("/account");
    await expect(visible(page.getByText("$2,500.00")).first()).toBeVisible();
    await page.goto("/admin/settings");
    await field(page, c.presets.label).fill(original);
    await visible(page.getByRole("button", { name: c.presets.save })).click();
    await expect(field(page, c.presets.label)).toHaveValue(original);
  });
});
