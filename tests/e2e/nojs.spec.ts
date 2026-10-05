import { test, expect } from "@playwright/test";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("e2e-nojs-all-text", async ({ page }) => {
    await page.goto("/");
    for (const sel of [
      ".hero-summary",
      "h2",
      "h3",
      ".card-part p",
      ".skill-group li",
      "footer a",
    ]) {
      const items = page.locator(sel);
      const n = await items.count();
      expect(n, sel).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        await expect(items.nth(i), `${sel} #${i}`).toBeVisible();
      }
    }
    await expect(page.locator("html")).not.toHaveClass(/js/);
    await expect(page.locator(".telemetry")).toHaveCSS("position", "static");
  });

  test("e2e-nojs-details-usable", async ({ page }) => {
    await page.goto("/");
    const details = page.locator("details");
    const n = await details.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const d = details.nth(i);
      await expect(d).not.toHaveAttribute("open", "");
      await d.locator("summary").click();
      await expect(d).toHaveAttribute("open", "");
    }
  });
});
