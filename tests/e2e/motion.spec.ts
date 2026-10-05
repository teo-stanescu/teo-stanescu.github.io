import { test, expect, type Page } from "@playwright/test";

const maxScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

const drawn = (page: Page) =>
  page.evaluate(() => {
    const p = document.querySelector<SVGGeometryElement>(".trajectory .drawn")!;
    return {
      // Chromium reports calc(0.5px) or 0%, so read the first number.
      offset: parseFloat(getComputedStyle(p).strokeDashoffset.replace(/^calc\(/, "")),
      length: p.getTotalLength(),
    };
  });

async function scrollTo(page: Page, y: number) {
  await page.evaluate(
    (y) =>
      new Promise((r) => {
        window.scrollTo(0, y);
        requestAnimationFrame(() => requestAnimationFrame(() => r(null)));
      }),
    y,
  );
}

test("e2e-trajectory-grows", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("html.js.motion");
  const max = await maxScroll(page);
  expect(max).toBeGreaterThan(500);
  const offsets: number[] = [];
  for (let i = 0; i < 5; i++) {
    await scrollTo(page, (max * i) / 4);
    const d = await drawn(page);
    expect(d.length).toBeGreaterThan(0);
    offsets.push(d.offset);
  }
  for (let i = 1; i < offsets.length; i++) expect(offsets[i]).toBeLessThan(offsets[i - 1]);
  expect(offsets[0]).toBeCloseTo(1, 1);
  expect(Math.abs(offsets[2] - 0.5)).toBeLessThanOrEqual(0.05);
  expect(Math.abs(offsets[4])).toBeLessThanOrEqual(0.05);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("e2e-reduced-motion-static", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("html.js");
    await expect(page.locator("html")).not.toHaveClass(/motion/);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    expect((await drawn(page)).offset).toBe(0);
    const n = await page.locator("article.card").count();
    for (let i = 0; i < n; i++) await expect(page.locator("article.card").nth(i)).toBeVisible();

    const max = await maxScroll(page);
    await scrollTo(page, max / 2);
    await page.locator("summary").first().scrollIntoViewIfNeeded();
    await page.locator("summary").first().hover();
    await page.locator("summary").nth(1).focus();
    await page.keyboard.press("Enter");
    await scrollTo(page, max);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    expect((await drawn(page)).offset).toBe(0);

    const bad = await page.evaluate(() => {
      const zero = (v: string) => v.split(",").every((s) => s.trim() === "0s");
      const out: string[] = [];
      for (const el of document.querySelectorAll("*")) {
        for (const pseudo of [null, "::before", "::after"]) {
          const cs = getComputedStyle(el, pseudo);
          if (!zero(cs.transitionDuration) || !zero(cs.animationDuration)) {
            out.push(`${el.tagName}.${el.className}${pseudo ?? ""}`);
          }
        }
      }
      return out;
    });
    expect(bad).toEqual([]);
  });
});

test("e2e-reduced-motion-live-switch", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("html.js.motion");
  const max = await maxScroll(page);
  await scrollTo(page, max / 2);
  expect((await drawn(page)).offset).toBeGreaterThan(0.2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).not.toHaveClass(/motion/);
  expect((await drawn(page)).offset).toBe(0);
  const dur = await page.evaluate(() =>
    getComputedStyle(document.querySelector(".stage h2")!, "::before").transitionDuration,
  );
  expect(dur.split(",").every((d) => d.trim() === "0s")).toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveClass(/motion/);
});
