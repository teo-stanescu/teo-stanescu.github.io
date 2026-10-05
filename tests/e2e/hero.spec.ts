import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";

test("e2e-hero-above-stage0", async ({ page }) => {
  await page.goto("/");
  const h1 = page.locator("h1");
  await expect(h1).toHaveCount(1);
  // The first h2 is Stage 0 once the stage task lands. The #main landmark follows the hero.
  const boundary = page.locator("h2, #main").first();
  const boundaryTop = (await boundary.boundingBox())!.y;
  const above = [
    h1,
    page.getByText("Principal Engineer", { exact: true }),
    page.getByText("Bucharest, Romania", { exact: true }),
    page.getByRole("link", { name: "GitHub", exact: true }),
    page.getByRole("link", { name: "Email", exact: true }),
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
  const cv = page.getByRole("link", { name: "Download CV (PDF)", exact: true });
  await expect(cv).toHaveCount(existsSync("public/cv.pdf") ? 1 : 0);
});
