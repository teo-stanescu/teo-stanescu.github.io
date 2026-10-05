import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";

test("e2e-hero-above-stage0", async ({ page }) => {
  await page.goto("/");
  const h1 = page.locator("h1");
  await expect(h1).toHaveCount(1);
  // The first h2 is Stage 0 once the stage task lands. The #main landmark follows the hero.
  const boundary = page.locator("h2, #main").first();
  const boundaryTop = (await boundary.boundingBox())!.y;
  const hasCv = existsSync("dist/cv.pdf");
  const cv = page.getByRole("link", { name: "Download CV (PDF)", exact: true });
  const above = [
    h1,
    page.getByText("Principal Engineer", { exact: true }),
    page.getByText("Bucharest, Romania", { exact: true }),
    page.getByRole("link", { name: "GitHub", exact: true }),
    page.getByRole("link", { name: "Email", exact: true }),
    ...(hasCv ? [cv] : []),
  ];
  for (const el of above) {
    const box = (await el.first().boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(boundaryTop + 1);
  }
  const h2 = page.locator("h2").first();
  if (await h2.count()) {
    const h2Top = (await h2.boundingBox())!.y;
    for (const el of above) {
      const box = (await el.first().boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(h2Top + 1);
    }
  }
  await expect(cv).toHaveCount(hasCv ? 1 : 0);
  // AC-03 order: the CV link comes first among the hero actions.
  const names = await page
    .locator("header.hero a:not(.skip-link)")
    .evaluateAll((els) => els.map((e) => e.textContent));
  expect(names).toEqual(hasCv ? ["Download CV (PDF)", "GitHub", "Email"] : ["GitHub", "Email"]);
});

test("e2e-skip-link-focuses-main", async ({ page }) => {
  await page.goto("/");
  const skip = page.locator("a.skip-link");
  await skip.focus();
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("main");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("SUMMARY");
});
