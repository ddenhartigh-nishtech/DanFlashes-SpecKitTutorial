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

    // FR-014 (010 FR-013): a preview of every MSRP, now and after, before anything is saved.
    const masterpiece = visible(page.getByTestId("tuning-row")).filter({
      hasText: "Dan's Masterpiece",
    });
    await expect(visible(page.getByTestId("real-shirt-start"))).toHaveText(
      c.tuning.startsAt("$300.00", "Complicated", 10),
    );
    await field(page, c.tuning.perPoint).fill("40.00");
    await expect(masterpiece.getByTestId("msrp-now")).toHaveText("$3,300.00");
    await expect(masterpiece.getByTestId("msrp-after")).toHaveText("$5,250.00");
    await expect(visible(page.getByTestId("real-shirt-start"))).toHaveText(
      c.tuning.startsAt("$450.00", "Complicated", 10),
    );

    // Saved, the store follows on its next page load; then the dials go back.
    const saveDials = visible(page.getByRole("button", { name: c.tuning.save }));
    await saveDials.click();
    await expect(consoleMessage(page).first()).toBeVisible();
    const store = await (await browser.newContext({ baseURL: info.project.use.baseURL })).newPage();
    await store.goto("/shirts/dans-masterpiece");
    await expect(visible(store.getByText("$5,250.00")).first()).toBeVisible();
    await field(page, c.tuning.perPoint).fill("25.00");
    await saveDials.click();
    await expect(masterpiece.getByTestId("msrp-now")).toHaveText("$3,300.00");
    await store.reload();
    await expect(visible(store.getByText("$3,300.00")).first()).toBeVisible();
    await store.context().close();

    // A free base is refused, and the refusal stays.
    await field(page, c.tuning.base).fill("0.00");
    await saveDials.click();
    await expect(visible(page.getByText(c.tuning.baseFormat))).toBeVisible();
    await page.waitForTimeout(4_500); // past a confirmation's lifetime (007 FR-028)
    await expect(visible(page.getByText(c.tuning.baseFormat))).toBeVisible();
    await field(page, c.tuning.base).fill("50.00");

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
