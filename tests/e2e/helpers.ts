import { expect, type Locator, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";

/**
 * Next 16 keeps previously visited routes mounted but hidden (React <Activity>), so a locator can
 * match a hidden copy on an earlier page. Always target the visible one.
 */
export const visible = (locator: Locator) => locator.filter({ visible: true });

/** Unique per run and project so desktop and phone never collide on the shared e2e database. */
export const uniqueEmail = (project: string) =>
  `e2e+${project}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@danflashes.local`;

export async function addShirt(page: Page, slug: string, size: string) {
  await page.goto(`/shirts/${slug}`);
  await page
    .locator("label")
    .filter({ hasText: new RegExp(`^${size}$`) })
    .click();
  await visible(page.getByRole("button", { name: "Add to cart" })).click();
  await expect(visible(page.getByText("It's in the cart. Excellent decision."))).toBeVisible();
}

export async function signUp(page: Page, email: string) {
  await visible(page.getByLabel("What should Dan call you?")).fill("Greg");
  await visible(page.getByLabel("Email")).fill(email);
  await visible(page.getByLabel("Password")).fill("complicated");
  await visible(page.getByRole("button", { name: "Sign up" })).click();
}

/** Connect (or apply) a revenue stream from the account page's form. */
export async function connect(
  page: Page,
  stream: {
    source: string;
    customName?: string;
    amount: string;
    schedule: string;
    /** A recurring top-off's interval, e.g. ["5", "minutes"]. */
    every?: [string, keyof typeof copy.streams.units];
    ongoing?: boolean;
  },
) {
  const s = copy.streams;
  const section = visible(page.locator("#revenue-streams"));
  await section.getByLabel(s.form.source).selectOption({ label: stream.source });
  if (stream.customName) await section.getByLabel(s.form.customName).fill(stream.customName);
  await section.getByLabel(s.form.amount).fill(stream.amount);
  await section.getByRole("radio", { name: stream.schedule }).check();
  if (stream.every) {
    await section.getByLabel(s.form.intervalCount).fill(stream.every[0]);
    await section.getByLabel(s.form.intervalUnit).selectOption(stream.every[1]);
  }
  if (stream.ongoing) await section.getByLabel(s.form.ongoing).check();
  // A one-time top-up is applied, not connected.
  const submit = stream.schedule === s.schedules.one_time ? s.form.apply : s.form.connect;
  await section.getByRole("button", { name: submit }).click();
}

/** Buy one shirt by card and land on its confirmation. */
export async function buyByCard(page: Page, slug: string, size: string) {
  await addShirt(page, slug, size);
  await page.goto("/checkout");
  await visible(page.getByLabel("Card number")).fill("4242 4242 4242 4242");
  await visible(page.getByLabel("Expiry (MM/YY)")).fill("12/29");
  await visible(page.getByLabel("CVC")).fill("123");
  await visible(page.getByRole("button", { name: /Place order/ })).click();
  await expect(page).toHaveURL(/\/orders\/\d+$/);
}
