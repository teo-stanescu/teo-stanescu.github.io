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
  // The tip plane follows the same progress.
  await scrollTo(page, max / 2);
  const t = await page.evaluate(() => ({
    tip: document.querySelector(".tip-plane")!.getBoundingClientRect().top + window.scrollY,
    main: document.querySelector("main")!.getBoundingClientRect(),
    sy: window.scrollY,
  }));
  const mainTop = t.main.top + t.sy;
  expect(Math.abs(t.tip + 8 - (mainTop + t.main.height * 0.5))).toBeLessThan(t.main.height * 0.05);
});

const tipY = (page: Page) =>
  page.evaluate(() => {
    const r = document.querySelector(".tip-plane")!.getBoundingClientRect();
    return r.top + r.height / 2 + window.scrollY;
  });
const mainBox = (page: Page) =>
  page.evaluate(() => {
    const r = document.querySelector("main")!.getBoundingClientRect();
    return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
  });

test("e2e-plane-follows-scroll", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("html.js.motion");
  const max = await maxScroll(page);
  const m = await mainBox(page);
  const samples: string[] = [];
  const tf = () => page.evaluate(() => getComputedStyle(document.querySelector(".tip-plane")!).transform);
  await scrollTo(page, 0);
  // With no scroll, two samples are equal: no timer moves the plane.
  const a = await tf();
  await page.waitForTimeout(400);
  expect(await tf()).toBe(a);
  expect(Math.abs((await tipY(page)) - m.top)).toBeLessThan(2);
  for (const f of [0.25, 0.5, 0.75, 1]) {
    await scrollTo(page, max * f);
    samples.push(await tf());
  }
  expect(new Set([a, ...samples]).size).toBe(5);
  // At the bottom the plane reaches the end of the line.
  expect(Math.abs((await tipY(page)) - m.bottom)).toBeLessThan(3);
});

test("e2e-no-infinite-animation", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("html.js.motion");
  const max = await maxScroll(page);
  await scrollTo(page, max / 2);
  const bad = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => (a.effect?.getComputedTiming().iterations ?? 1) === Infinity)
      .map((a) => String((a as CSSAnimation).animationName ?? a.id)),
  );
  expect(bad).toEqual([]);
  // No CSS rule loops either.
  const loops = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll("*")) {
      for (const pseudo of [null, "::before", "::after"]) {
        const cs = getComputedStyle(el, pseudo);
        if (cs.animationName !== "none" && cs.animationIterationCount.includes("infinite")) out.push(el.tagName);
      }
    }
    return out;
  });
  expect(loops).toEqual([]);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("e2e-reduced-motion-static", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("html.js");
    await expect(page.locator("html")).not.toHaveClass(/motion/);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    expect((await drawn(page)).offset).toBe(0);
    // The tip plane stays at the start of the line.
    const mb = await mainBox(page);
    expect(Math.abs((await tipY(page)) - mb.top)).toBeLessThan(2);
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
    expect(Math.abs((await tipY(page)) - mb.top)).toBeLessThan(2);

    // A nav click adds no transition or animation.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForSelector("html.nav-ready");
    await page.locator('#nav a[href="#top"]').click();
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);

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

test.describe("plane reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("e2e-plane-reduced-motion-static", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("html.js");
    await expect(page.locator("html")).not.toHaveClass(/motion/);
    const max = await maxScroll(page);
    const m = await mainBox(page);
    for (const f of [0, 0.5, 1]) {
      await scrollTo(page, max * f);
      expect(await page.evaluate(() => getComputedStyle(document.querySelector(".tip-plane")!).transform)).toBe("none");
      expect(Math.abs((await tipY(page)) - m.top)).toBeLessThan(2);
    }
  });
});

test("e2e-forced-colors-print-hides-map", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.waitForSelector("html.js.search-ready");
  await expect(page.locator(".atc-map")).toBeVisible();
  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.locator(".atc-map")).toBeHidden();
  await page.emulateMedia({ forcedColors: "none" });
  await expect(page.locator(".atc-map")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".atc-map")).toBeHidden();
  await expect(page.locator("#topbar")).toBeHidden();
  await expect(page.locator(".search")).toBeHidden();
  await expect(page.locator(".nav")).toBeHidden();
  await expect(page.getByRole("button", { name: /contents/i })).toHaveCount(0);
});

test("e2e-map-contrast-both-themes", async ({ page }) => {
  for (const scheme of ["dark", "light"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const r = await page.evaluate(() => {
      const rgb = (c: string) => {
        const m = c.match(/[\d.]+/g)!.map(Number);
        return { c: m.slice(0, 3), a: m[3] ?? 1 };
      };
      const lum = (c: number[]) => {
        const f = c.map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * f[0]! + 0.7152 * f[1]! + 0.0722 * f[2]!;
      };
      const ratio = (a: number[], b: number[]) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
        return (x! + 0.05) / (y! + 0.05);
      };
      const map = document.querySelector(".atc-map")!;
      const op = parseFloat(getComputedStyle(map).opacity);
      const stroke = rgb(getComputedStyle(map).color).c;
      const bg = rgb(getComputedStyle(document.body).backgroundColor).c;
      // Worst case: a full-strength map stroke under the text, blended at the layer opacity.
      const under = bg.map((v, i) => v * (1 - op) + stroke[i]! * op);
      const out: Record<string, number> = {};
      for (const sel of ["h1", ".hero-summary", ".hero-title", ".stage h2", ".stage-label", ".eyebrow", "footer p"]) {
        const el = document.querySelector(sel);
        if (!el) continue;
        out[sel] = ratio(rgb(getComputedStyle(el).color).c, under);
      }
      return { op, out };
    });
    expect(r.op, scheme).toBeLessThanOrEqual(0.1);
    expect(Object.keys(r.out).length, scheme).toBeGreaterThan(3);
    for (const [sel, v] of Object.entries(r.out)) expect(v, `${scheme} ${sel}`).toBeGreaterThanOrEqual(4.5);
  }
});
