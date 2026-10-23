import { expect, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { awesomeButton, signUp, test, uniqueEmail, visible } from "./helpers";

const p = copy.pssb;
/** The price tests/e2e/pssb-stub.ts plants, which the store never gave it. */
const PLANTED_PRICE = "$749.99";
const launcher = (page: Page) => visible(page.getByTestId("pssb-launcher"));
const panel = (page: Page) => visible(page.getByTestId("pssb-panel"));
const bubble = (page: Page) => visible(page.getByTestId("pssb-bubble"));
const replies = (page: Page) =>
  visible(page.locator('[data-testid="pssb-message"][data-role="pssb"]'));

/** Open the chat and ask, waiting for PSSB's finished reply (one with the store's own markup). */
async function ask(page: Page, question: string) {
  if ((await panel(page).count()) === 0) await launcher(page).click();
  const before = await replies(page).count();
  await panel(page).getByLabel(p.placeholder).fill(question);
  await panel(page).getByRole("button", { name: p.send }).click();
  await expect(replies(page)).toHaveCount(before + 1);
  const reply = replies(page).nth(before);
  await expect(panel(page).getByRole("button", { name: p.send })).toBeDisabled(); // empty box
  await expect(page.getByTestId("pssb-judging")).toHaveCount(0);
  return reply;
}

test.describe("012 US1 — ask PSSB anything", () => {
  test("he answers in character, links real shirts, and never shows a price the store didn't give him", async ({
    page,
  }) => {
    await page.goto("/shirts");
    await launcher(page).click();
    await expect(panel(page)).toHaveAttribute("data-steady");
    await expect(panel(page)).toContainText(p.welcome);

    const reply = await ask(page, "Is Fractal Fury worth it?");
    await expect(reply).toContainText(p.priceGuard);
    await expect(reply).not.toContainText(PLANTED_PRICE);
    const link = reply.getByRole("link", { name: "Fractal Fury" }).first();
    await expect(link).toHaveAttribute("href", "/shirts/fractal-fury");

    // FR-007, Q6: no support email set, so Dan is somewhere magnificent, and there's no address.
    const order = await ask(page, "Where is my order?");
    await expect(order).toContainText("International Pattern Council");
    await expect(order).not.toContainText("@");

    // The link goes to the real shirt, at the store's price.
    await link.click();
    await expect(page).toHaveURL(/\/shirts\/fractal-fury$/);
    await expect(visible(page.getByTestId("price")).first()).toHaveText("$1,350.00");
  });

  test("under Extreme Awesomeness and at 360px, the chat holds still and nothing scrolls sideways", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/");
    await awesomeButton(page).click();
    await launcher(page).click();
    await expect(panel(page)).toHaveAttribute("data-steady");
    await ask(page, "Who is Dan?");
    const sideways = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(sideways).toBe(false);
    await panel(page).getByRole("button", { name: p.close }).click();
    await expect(panel(page)).toHaveCount(0);
  });
});

/** Fake time, with PSSB's clock started at `t`: his approaches become testable (R9). */
async function freshClock(page: Page, t = new Date("2026-10-21T12:00:00Z")) {
  await page.clock.install({ time: t });
  // Runs after the fixture's push-away, so the 2 minutes count from now.
  await page.addInitScript(() => localStorage.setItem("df-pssb-last", String(Date.now())));
}

test.describe("012 US2 — he comes to you", () => {
  test("every 2 minutes, about the page; a sulk after he's closed; held while he types", async ({
    page,
  }) => {
    await freshClock(page);
    await page.goto("/shirts/geo-riot");
    await expect(launcher(page)).toBeVisible();
    await page.clock.fastForward(110_000);
    await expect(bubble(page)).toHaveCount(0);
    await page.clock.fastForward(15_000);
    await expect(bubble(page)).toContainText("Still staring at Geo Riot? Buy it.");

    await page.getByTestId("pssb-bubble-close").click();
    await page.clock.fastForward(125_000);
    await expect(bubble(page)).toContainText("You closed me.");

    // Open, with words in his box: PSSB waits.
    await bubble(page).getByRole("button").first().click();
    await panel(page).getByLabel(p.placeholder).fill("hmm");
    const count = await replies(page).count();
    await page.clock.fastForward(130_000);
    await expect(replies(page)).toHaveCount(count);
    await panel(page).getByLabel(p.placeholder).fill("");
    await page.clock.fastForward(10_000);
    await expect(replies(page)).toHaveCount(count + 1);
  });

  test("two tabs share one clock, so he doesn't double the pitching", async ({ context }) => {
    // One clock for the whole context: both tabs' timers fire at the same instant, the hardest
    // case. The Web Locks claim lets exactly one of them pitch.
    await context.clock.install({ time: new Date("2026-10-21T12:00:00Z") });
    await context.addInitScript(() => localStorage.setItem("df-pssb-last", String(Date.now())));
    const [a, b] = [await context.newPage(), await context.newPage()];
    await a.goto("/shirts");
    await b.goto("/");
    await expect(launcher(a)).toBeVisible();
    await expect(launcher(b)).toBeVisible();
    await context.clock.fastForward(125_000);
    const pitches = async () => (await bubble(a).count()) + (await bubble(b).count());
    await expect.poll(pitches).toBe(1);
    await a.waitForTimeout(1_000);
    expect(await pitches()).toBe(1);
  });
});

test.describe("012 US3 — say the word", () => {
  test("Add it puts exactly that shirt in the cart; a BLAND shirt gets no button", async ({
    page,
  }) => {
    await page.goto("/shirts");
    await expect(page.getByTestId("cart-count")).toHaveCount(0); // a fresh, empty cart
    const before = 0;

    const yes = await ask(page, "add Fractal Fury in L");
    const add = yes.getByTestId("pssb-add");
    await expect(add).toHaveText(p.addIt("Fractal Fury", "L", "$1,350.00"));
    await expect(add).toHaveAttribute("data-steady");
    await add.click();
    await expect(
      visible(page.locator('[data-testid="pssb-message"][data-role="store"]')).last(),
    ).toContainText(copy.product.added);
    await expect(visible(page.getByTestId("cart-count")).first()).toHaveText(String(before + 1));

    // Fake scarcity: the second one is "found".
    const again = await ask(page, "add Fractal Fury in L");
    await again.getByTestId("pssb-add").click();
    await expect(
      visible(page.locator('[data-testid="pssb-message"][data-role="store"]')).last(),
    ).toContainText(copy.urgency.foundAnother);

    const bland = await ask(page, "add Beige Regret in M");
    await expect(bland).toContainText("Beige? Absolutely not.");
    await expect(bland.getByTestId("pssb-add")).toHaveCount(0);
    await expect(visible(page.getByTestId("cart-count")).first()).toHaveText(String(before + 2));
  });
});

test.describe("012 US4 — he knows you", () => {
  test("a signed-in shopper's Flash Credit, exactly", async ({ page }, info) => {
    test.slow(); // a real sign-up (bcrypt)
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(`${info.project.name}-pssb`));
    await expect(page).toHaveURL(/\/account$/, { timeout: 30_000 });
    const reply = await ask(page, "How much credit do I have?");
    await expect(reply).toContainText("You have $0.00 of Flash Credit.");
  });
});
