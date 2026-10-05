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

  test("e2e-nojs-bar-label-no-break", async ({ page }) => {
    for (const w of [360, 375]) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto("/");
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>(".telemetry dt, .telemetry dd")]
          .filter((el) => el.getBoundingClientRect().width > 2)
          .map((el) => {
            const cs = getComputedStyle(el);
            return {
              text: (el.textContent ?? "").slice(0, 24),
              rows: Math.round(el.getBoundingClientRect().height / parseFloat(cs.lineHeight)),
              display: cs.display,
            };
          }),
      );
      expect(rows.length).toBeGreaterThan(0);
      // A label is one line. A value may wrap between words, never inside one.
      for (const r of rows.filter((x) => /^(Stage|Role|Years|Team led|Focus)/.test(x.text) && x.text.length < 10)) {
        expect(r.rows, `${w} ${r.text}`).toBe(1);
      }
      const split = await page.evaluate(() => {
        const bad: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>(".telemetry dt, .telemetry dd")) {
          const words = (el.textContent ?? "").split(/\s+/).filter(Boolean);
          const node = el.firstChild;
          if (!node || node.nodeType !== 3) continue;
          const text = node.textContent ?? "";
          let i = 0;
          for (const w of words) {
            const at = text.indexOf(w, i);
            if (at < 0) continue;
            const range = document.createRange();
            range.setStart(node, at);
            range.setEnd(node, at + w.length);
            if (range.getClientRects().length > 1) bad.push(w);
            i = at + w.length;
          }
        }
        return bad;
      });
      expect(split, `words broken at ${w}`).toEqual([]);
    }
  });

  test("e2e-nojs-nav-list", async ({ page }) => {
    for (const w of [360, 1280]) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto("/");
      // Below 1280 px the nested role lists are hidden (compact list). From 1280 px every link shows.
      const links = page.locator(w < 1280 ? "#nav > ul > li > a" : "#nav a");
      const n = await links.count();
      expect(n).toBeGreaterThanOrEqual(w < 1280 ? 7 : 15);
      for (let i = 0; i < n; i++) await expect(links.nth(i), `${w} link ${i}`).toBeVisible();
      await page.locator('#nav a[href="#stage-1"]').click();
      expect(new URL(page.url()).hash).toBe("#stage-1");
      const top = await page.evaluate(() => document.getElementById("stage-1")!.getBoundingClientRect().top);
      expect(top).toBeLessThan(400);
      if (w < 1280) continue;
      await page.goto("/");
      await page.locator("#nav a[href$='-heading']").first().click();
      expect(new URL(page.url()).hash).toMatch(/-heading$/);
    }
  });

  test("e2e-nojs-nav-compact-375", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    // Role links are hidden. Stage links, Top, Skills and Contact stay.
    await expect(page.locator("#nav li > ul a").first()).toBeHidden();
    await expect(page.locator("#nav > ul > li > a")).toHaveCount(7);
    const nav = (await page.locator("#nav").boundingBox())!;
    const h1 = (await page.locator("h1").boundingBox())!;
    expect(nav.height).toBeLessThanOrEqual(280);
    expect(h1.y).toBeLessThanOrEqual(400);
  });

  test("e2e-nojs-panel-aligned-1280", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const panel = (await page.locator(".telemetry").boundingBox())!;
    const h1 = (await page.locator("h1").boundingBox())!;
    const track = (await page.locator(".trajectory").boundingBox())!;
    expect(Math.abs(panel.x - h1.x)).toBeLessThanOrEqual(2);
    expect(panel.x).toBeGreaterThanOrEqual(track.x + track.width);
    const nav = (await page.locator("#nav").boundingBox())!;
    expect(nav.x + nav.width).toBeLessThanOrEqual(h1.x);
    expect(nav.x + nav.width).toBeLessThanOrEqual(track.x);
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
