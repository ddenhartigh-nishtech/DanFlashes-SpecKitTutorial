import { expect } from "@playwright/test";
import Database from "better-sqlite3";
import { test, visible } from "./helpers";

/** A shirt's score and Dan's own price, read the way dial.spec reads scores (they never ship). */
function catalog(): Map<string, { complexity: number; finalPriceUsd: string | null }> {
  const db = new Database("data/e2e.db", { readonly: true });
  try {
    const rows = db
      .prepare("SELECT slug, complexity, final_price_usd AS finalPriceUsd FROM shirts")
      .all() as { slug: string; complexity: number; finalPriceUsd: string | null }[];
    return new Map(rows.map((r) => [r.slug, r]));
  } finally {
    db.close();
  }
}

/** "$3,300.00" as whole cents. */
const cents = (text: string) => BigInt(text.replace(/[^\d]/g, ""));

test.describe("010 — the straight line", () => {
  test("every shirt on the floor sells at $50.00 + $25.00 a point (SC-001, SC-003)", async ({
    page,
  }, info) => {
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });
    const shirts = catalog();
    for (const path of ["/shirts", "/"]) {
      await page.goto(path);
      // The listing streams in behind Suspense: wait for it before counting.
      await expect(visible(page.getByTestId("shirt-card")).first()).toBeVisible();
      const cards = await visible(page.getByTestId("shirt-card")).all();
      for (const card of cards) {
        const slug = (await card.getByRole("link").first().getAttribute("href"))!.split("/").pop()!;
        const shirt = shirts.get(slug)!;
        const shown = cents(await card.getByTestId("price").innerText());
        const line = BigInt(5_000) + BigInt(2_500) * BigInt(shirt.complexity);
        expect(shown, `${slug} on ${path}`).toBe(
          shirt.finalPriceUsd === null ? line : cents(shirt.finalPriceUsd),
        );
      }
      const sideways = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(sideways, `${path} scrolls sideways`).toBe(false);
    }
  });
});
