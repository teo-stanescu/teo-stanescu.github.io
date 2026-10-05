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

  test("e2e-nojs-card-meta", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator("article.card");
    const n = await cards.count();
    for (let i = 0; i < n; i++) {
      const card = cards.nth(i);
      const team = await card.getAttribute("data-team");
      const focus = await card.getAttribute("data-focus");
      const meta = card.locator(".card-meta");
      if (team) await expect(meta).toContainText(team);
      if (focus) await expect(meta).toContainText(focus);
    }
  });

  test("e2e-nojs-panel-aligned-1280", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const panel = (await page.locator(".telemetry").boundingBox())!;
    const h1 = (await page.locator("h1").boundingBox())!;
    const track = (await page.locator(".trajectory").boundingBox())!;
    expect(Math.abs(panel.x - h1.x)).toBeLessThanOrEqual(2);
    expect(panel.x).toBeGreaterThanOrEqual(track.x + track.width);
    const main = (await page.locator("main").boundingBox())!;
    expect(panel.y + panel.height).toBeLessThanOrEqual(main.y + 1);
  });

  test("e2e-nojs-panel-short-landscape-640x360", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 360 });
    await page.goto("/");
    const panel = (await page.locator(".telemetry").boundingBox())!;
    expect(panel.height).toBeGreaterThan(30);
    const rows = await page.locator(".telemetry dd").evaluateAll((els) =>
      els
        .filter((e) => getComputedStyle(e.parentElement!).display !== "none")
        .map((e) => {
          const r = e.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom };
        }),
    );
    for (const r of rows) {
      expect(r.top).toBeGreaterThanOrEqual(panel.y - 1);
      expect(r.bottom).toBeLessThanOrEqual(panel.y + panel.height + 1);
    }
    const main = (await page.locator("main").boundingBox())!;
    expect(panel.y + panel.height).toBeLessThanOrEqual(main.y + 1);
  });
});
