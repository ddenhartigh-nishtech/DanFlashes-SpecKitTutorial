import { readFileSync, existsSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { DEMO_SHOPPER } from "../../scripts/seed-data";
import { copy } from "../../src/lib/copy";
import { test, uniqueEmail, visible } from "./helpers";

const n = copy.nosy;
const nosyInputs = (page: Page) => visible(page.getByTestId("nosy-field")).locator("input");
const signUpButton = (page: Page) => visible(page.getByRole("button", { name: copy.auth.signUp }));

async function fillReal(page: Page, email: string) {
  await visible(page.getByLabel("What should Dan call you?")).fill("Greg");
  await visible(page.getByLabel("Email")).fill(email);
  await visible(page.getByLabel("Password")).fill("complicated");
}

/** What's typed in each nosy field, read back from the screen (only for these checks). */
const typed = (page: Page) =>
  nosyInputs(page).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));

async function typeEverywhere(page: Page, text: (i: number) => string) {
  const inputs = await nosyInputs(page).all();
  for (const [i, input] of inputs.entries()) await input.fill(text(i));
  return inputs.length;
}

test.describe("US1 — the nosy sign-up", () => {
  test("asks for far too much, after the real fields, with every answer a prop", async ({
    page,
  }, info) => {
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/sign-up");

    // US1-1, FR-003, FR-009: the real fields first (** on the ones that are), then the nosy scroll.
    await expect(visible(page.locator("label", { hasText: "Email" }))).toContainText("**");
    await expect(visible(page.locator("label", { hasText: "Password" }))).toContainText("**");
    await expect(
      visible(page.locator("label", { hasText: "What should Dan call you?" })),
    ).not.toContainText("**");
    const fields = visible(page.getByTestId("nosy-field"));
    expect(await fields.count()).toBeGreaterThanOrEqual(10);
    for (const field of await fields.all()) await expect(field).toContainText(n.required);
    await expect(visible(page.getByText(n.legend))).toBeVisible();
    const order = await page.evaluate(() => {
      const visibleOnly = (els: Element[]) =>
        els.filter((e) => (e as HTMLElement).checkVisibility());
      const nosy = visibleOnly([...document.querySelectorAll('[data-testid="nosy-field"]')]);
      const email = visibleOnly([...document.querySelectorAll('input[name="email"]')])[0];
      const button = visibleOnly([...document.querySelectorAll("button")]).find(
        (b) => b.textContent?.trim() === "Sign up",
      )!;
      const before = (a: Element, b: Element) =>
        Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return { realFirst: before(email, nosy[0]), buttonLast: before(nosy.at(-1)!, button) };
    });
    expect(order).toEqual({ realFirst: true, buttonLast: true });

    // FR-005, FR-006: unnamed, outside the form, no autofill or spellcheck, ignored by password
    // managers; the two classic security answers masked.
    const props = await nosyInputs(page).evaluateAll((els) =>
      els.map((e) => {
        const input = e as HTMLInputElement;
        return {
          label: input.closest("label")?.textContent ?? "",
          name: input.getAttribute("name"),
          inForm: input.form !== null,
          autocomplete: input.getAttribute("autocomplete"),
          spellcheck: input.getAttribute("spellcheck"),
          hints: ["data-1p-ignore", "data-lpignore", "data-bwignore"].every((a) =>
            input.hasAttribute(a),
          ),
          formType: input.getAttribute("data-form-type"),
          masked: getComputedStyle(input).getPropertyValue("-webkit-text-security"),
        };
      }),
    );
    for (const p of props) {
      expect(p, p.label).toMatchObject({
        name: null,
        inForm: false,
        autocomplete: "off",
        spellcheck: "false",
        hints: true,
        formType: "other",
      });
      const shouldMask = /Social Security Number|Mother's maiden name/.test(p.label);
      expect(p.masked, p.label).toBe(shouldMask ? "disc" : "none");
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // FR-011, analysis C3: sign-in is unchanged.
    await page.goto("/sign-in");
    await expect(visible(page.getByRole("button", { name: copy.auth.signIn }))).toBeVisible();
    await expect(page.getByTestId("nosy-field")).toHaveCount(0);
    await expect(page.getByText(n.legend)).toHaveCount(0);
    await expect(visible(page.locator("label", { hasText: "Email" }))).not.toContainText("**");
  });

  test("what he typed is gone when he leaves, however he leaves (FR-007)", async ({ page }) => {
    await page.goto("/sign-up");
    const count = await typeEverywhere(page, (i) => `typed-${i}`);
    expect(count).toBeGreaterThanOrEqual(10);

    // A full page load, then Back.
    await page.goto("/about");
    await page.goBack();
    await expect(nosyInputs(page).first()).toBeVisible();
    expect((await typed(page)).every((v) => v === "")).toBe(true);

    // An in-app navigation (the page stays mounted, hidden), then Back (analysis C2).
    await typeEverywhere(page, (i) => `again-${i}`);
    const menu = page.locator("summary", { hasText: "Menu" });
    if (await menu.isVisible()) await menu.click();
    await visible(
      page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "About" }),
    ).click();
    await expect(page).toHaveURL(/\/about$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/sign-up/);
    await expect(nosyInputs(page).first()).toBeVisible();
    expect((await typed(page)).every((v) => v === "")).toBe(true);
  });

  test("blanks get one line from Dan, once per visit, then he's in (FR-008)", async ({
    page,
  }, info) => {
    test.slow(); // three sign-up attempts with real bcrypt
    await page.goto("/sign-up");
    await fillReal(page, DEMO_SHOPPER.email); // taken

    // First press: Dan's line, and nothing happens.
    await signUpButton(page).click();
    await expect(visible(page.getByTestId("nosy-skipped"))).toHaveText(n.skipped);
    await expect(page).toHaveURL(/\/sign-up/);

    // Next press goes to the store, which refuses the taken email: no second line (analysis C4).
    await signUpButton(page).click();
    await expect(visible(page.getByText(copy.codes.EMAIL_TAKEN))).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/sign-up/);

    // A good email, and the next press signs him up. (A refused sign-up resets the real form, as it
    // always has, so he fills it in again.)
    await fillReal(page, uniqueEmail(info.project.name));
    await signUpButton(page).click();
    await expect(page).toHaveURL(/\/account$/, { timeout: 30_000 });
  });

  test("nothing he types reaches the store: not sent, stored or logged (FR-004, SC-001)", async ({
    page,
    context,
  }, info) => {
    test.slow(); // a sign-up, then a scan of the database files
    const sentinel = (i: number) => `NOSY-${i}-7Q2X`;
    const sent: string[] = [];
    const logged: string[] = [];
    page.on("request", async (request) => {
      const headers = await request.allHeaders().catch(() => ({}));
      sent.push(`${request.url()}\n${JSON.stringify(headers)}\n${request.postData() ?? ""}`);
    });
    page.on("console", (message) => logged.push(message.text()));

    await page.goto("/sign-up");
    await fillReal(page, uniqueEmail(info.project.name));
    const count = await typeEverywhere(page, sentinel);

    // Every nosy field filled: the first press signs him up.
    await signUpButton(page).click();
    await expect(page).toHaveURL(/\/account$/, { timeout: 30_000 });
    await expect(visible(page.getByRole("heading", { level: 1 }))).toContainText("Greg");

    const sentinels = [...Array(count).keys()].map(sentinel);
    const found = (haystack: string) => sentinels.filter((s) => haystack.includes(s));
    expect(found(sent.join("\n")), "in a request").toEqual([]);
    expect(found(logged.join("\n")), "in the console").toEqual([]);
    const storage = await page.evaluate(() =>
      JSON.stringify([{ ...localStorage }, { ...sessionStorage }, document.cookie]),
    );
    expect(found(storage + JSON.stringify(await context.cookies())), "in browser storage").toEqual(
      [],
    );
    for (const file of ["data/e2e.db", "data/e2e.db-wal"]) {
      if (!existsSync(file)) continue;
      expect(found(readFileSync(file).toString("latin1")), `in ${file}`).toEqual([]);
    }
    expect(found(await page.locator("body").innerText()), "on the account page").toEqual([]);
  });
});
