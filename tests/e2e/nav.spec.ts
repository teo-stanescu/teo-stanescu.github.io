import { test, expect, type Page } from "@playwright/test";

async function ready(page: Page, url = "/") {
  await page.goto(url);
  await page.waitForSelector("html.js.nav-ready");
}

const frames = (page: Page) =>
  page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
  );

async function centerOn(page: Page, selector: string, index = 0) {
  await page.evaluate(
    ({ selector, index }) =>
      document.querySelectorAll(selector)[index].scrollIntoView({ block: "center", behavior: "instant" }),
    { selector, index },
  );
  await frames(page);
}

// What the nav and the telemetry show right now.
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const loc = [...document.querySelectorAll('#nav a[aria-current="location"]')];
    const role = [...document.querySelectorAll('#nav a[aria-current="true"]')];
    const stageEl = loc[0] ? document.querySelector(loc[0].getAttribute("href")!) : null;
    const tStage = document.querySelector('.telemetry [data-t="stage"]')!.textContent;
    const tRole = document.querySelector('.telemetry [data-t="role"]')!.textContent;
    return {
      locCount: loc.length,
      locHref: loc[0]?.getAttribute("href") ?? null,
      roleText: role[0]?.textContent ?? null,
      navStage: stageEl?.querySelector("article.card")?.getAttribute("data-stage") ?? null,
      tStage,
      tRole,
    };
  });
}

test("e2e-nav-active-entry", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  expect((await snapshot(page)).locHref).toBe("#top");
  const n = await page.locator("article.card").count();
  for (let i = 0; i < n; i++) {
    await centerOn(page, "article.card", i);
    const s = await snapshot(page);
    expect(s.locCount, `card ${i}`).toBe(1);
    const stageId = await page
      .locator("article.card")
      .nth(i)
      .evaluate((c) => c.closest("section.stage")!.id);
    expect(s.locHref, `card ${i}`).toBe(`#${stageId}`);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await frames(page);
  const end = await snapshot(page);
  expect(end.locCount).toBe(1);
  expect(end.locHref).toBe("#contact");
  await page.evaluate(() => window.scrollTo(0, 0));
  await frames(page);
  expect((await snapshot(page)).locHref).toBe("#top");
});

test("e2e-nav-roles-hidden-inactive", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  await centerOn(page, "article.card", 0);
  const vis = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("#nav li > ul")].map((ul) => {
      const li = ul.parentElement!;
      const active = !!li.querySelector('a[aria-current="location"]');
      const links = [...ul.querySelectorAll("a")].map((a) => getComputedStyle(a).visibility === "visible");
      return { active, shown: links.every(Boolean), hidden: links.every((h) => !h) };
    }),
  );
  expect(vis.length).toBeGreaterThan(1);
  for (const v of vis) {
    if (v.active) expect(v.shown).toBe(true);
    else expect(v.hidden).toBe(true);
  }
  expect(vis.filter((v) => v.active).length).toBe(1);
  // Hidden links are out of the tab order: visibility hidden removes them.
  const hiddenDisplay = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("#nav li > ul")]
      .filter((ul) => !ul.parentElement!.querySelector('a[aria-current="location"]'))
      .every((ul) => getComputedStyle(ul).visibility === "hidden"),
  );
  expect(hiddenDisplay).toBe(true);
});

test("e2e-nav-roles-hidden-inactive without nav-ready all roles show", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  await page.evaluate(() => document.documentElement.classList.remove("nav-ready"));
  const hidden = await page.evaluate(
    () =>
      [...document.querySelectorAll("#nav li > ul a")].filter((a) => getComputedStyle(a).visibility === "hidden")
        .length,
  );
  expect(hidden).toBe(0);
});

test("e2e-nav-click-focus-hash", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll("#nav a")].map((a) => a.getAttribute("href")!),
  );
  for (const href of ["#stage-" + hrefs.find((h) => h.startsWith("#stage-"))!.slice(7), hrefs.find((h) => h.endsWith("-heading"))!, "#skills"]) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await frames(page);
    // Open the stage so a role link is visible, then click.
    const link = page.locator(`#nav a[href="${href}"]`);
    if (!(await link.isVisible())) {
      const stage = await page.evaluate((h) => {
        const a = document.querySelector(`#nav a[href="${h}"]`)!;
        return a.closest("ul")!.closest("li")!.querySelector(":scope > a")!.getAttribute("href");
      }, href);
      await page.locator(`#nav a[href="${stage}"]`).click();
      await page.waitForTimeout(900);
    }
    await link.click();
    await page.waitForTimeout(1200);
    const id = href.slice(1);
    expect(new URL(page.url()).hash).toBe(href);
    const r = await page.evaluate((id) => {
      const t = document.getElementById(id)!;
      const ae = document.activeElement as HTMLElement;
      const heading = /^H[1-6]$/.test(t.tagName) ? t : t.querySelector("h1,h2,h3")!;
      const bar = document.getElementById("topbar")!.getBoundingClientRect().bottom;
      return {
        focusIsHeading: ae === heading,
        tab: ae.getAttribute("tabindex"),
        top: heading.getBoundingClientRect().top,
        bar,
      };
    }, id);
    expect(r.focusIsHeading, href).toBe(true);
    expect(r.tab).toBe("-1");
    expect(r.top, href).toBeGreaterThanOrEqual(r.bar - 1);
  }
});

test("e2e-nav-click-focus-hash uses replaceState and preventScroll", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  const len = await page.evaluate(() => history.length);
  await page.locator('#nav a[href="#skills"]').click();
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => history.length)).toBe(len);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("e2e-nav-reduced-motion-instant", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await ready(page);
    await page.locator('#nav a[href="#skills"]').click();
    // No wait: an instant jump is done at once.
    const r = await page.evaluate(() => {
      const t = document.getElementById("skills")!.getBoundingClientRect().top;
      return { t, y: window.scrollY, anim: document.getAnimations().length };
    });
    expect(r.y).toBeGreaterThan(500);
    expect(r.t).toBeLessThan(200);
    expect(r.anim).toBe(0);
  });
});

test("e2e-nav-hash-on-load-role", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const ids = await page.evaluate(() => [...document.querySelectorAll("article.card")].map((c) => c.id));
  for (const id of [ids[1], ids[ids.length - 1]]) {
    await page.goto(`/#${id}`);
    await page.waitForSelector("html.js.nav-ready");
    await frames(page);
    const s = await snapshot(page);
    const title = await page.evaluate(
      (id) => document.getElementById(id)!.getAttribute("data-role"),
      id,
    );
    expect(s.tRole).toBe(title);
    expect(s.roleText).toBe(title);
    expect(s.navStage).toBe(s.tStage);
  }
});

test("e2e-nav-telemetry-agree", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  const n = await page.locator("article.card").count();
  for (let i = 0; i < n; i++) {
    await centerOn(page, "article.card", i);
    const s = await snapshot(page);
    expect(s.locCount).toBe(1);
    expect(s.roleText, `card ${i}`).toBe(s.tRole);
    expect(s.navStage, `card ${i}`).toBe(s.tStage);
  }
});

test.describe("contents popover", () => {
  test.use({ viewport: { width: 1024, height: 800 } });

  test("e2e-contents-popover", async ({ page }) => {
    await ready(page);
    const btn = page.locator("#topbar button.contents-btn");
    await expect(btn).toHaveAttribute("aria-expanded", "false");
    await expect(btn).toHaveAttribute("aria-controls", "nav");
    await expect(page.locator("#nav")).toBeHidden();
    await btn.click();
    await expect(btn).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#nav")).toBeVisible();
    expect(await page.evaluate(() => document.querySelectorAll("nav").length)).toBe(1);
    const onActive = await page.evaluate(
      () => document.activeElement === document.querySelector('#nav a[aria-current="location"]'),
    );
    expect(onActive).toBe(true);
  });

  test("e2e-contents-escape-focus", async ({ page }) => {
    await ready(page);
    const btn = page.locator("#topbar button.contents-btn");
    await btn.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#nav")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#nav")).toBeHidden();
    await expect(btn).toBeFocused();
    await expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  test("e2e-contents-link-closes", async ({ page }) => {
    await ready(page);
    await page.locator("#topbar button.contents-btn").click();
    await page.locator('#nav a[href="#skills"]').click();
    await expect(page.locator("#nav")).toBeHidden();
    await expect(page.locator("#topbar button.contents-btn")).toHaveAttribute("aria-expanded", "false");
    await page.waitForTimeout(1200);
    expect(new URL(page.url()).hash).toBe("#skills");
  });

  test("e2e-contents-resize-1279-1280", async ({ page }) => {
    await page.setViewportSize({ width: 1279, height: 800 });
    await ready(page);
    await page.locator("#topbar button.contents-btn").click();
    await expect(page.locator("#nav")).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator("#nav")).not.toHaveAttribute("popover");
    await expect(page.locator("#nav")).toBeVisible();
    expect(await page.evaluate(() => document.querySelector("#nav")!.matches(":popover-open"))).toBe(false);
    await expect(page.locator("#topbar button.contents-btn")).toBeHidden();
    const box = await page.locator("#nav").boundingBox();
    expect(box!.x).toBeLessThan(260);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(sw).toBe(true);
    await page.setViewportSize({ width: 1279, height: 800 });
    await expect(page.locator("#nav")).toBeHidden();
    await expect(page.locator("#topbar button.contents-btn")).toBeVisible();
  });
});

test("e2e-nav-module-blocked", async ({ page }) => {
  await page.route("**/*.js", (r) => r.abort());
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/");
  await page.waitForLoadState("load");
  await expect(page.locator("#topbar button")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/nav-ready/);
  await expect(page.locator("#nav")).toBeVisible();
  const links = page.locator("#nav li > ul a");
  const n = await links.count();
  expect(n).toBeGreaterThan(3);
  for (let i = 0; i < n; i++) await expect(links.nth(i)).toBeVisible();
});

test("e2e-startup-error-static", async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as { IntersectionObserver?: unknown }).IntersectionObserver;
  });
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const cls = await page.evaluate(() => document.documentElement.className);
  expect(cls).not.toMatch(/\bjs\b/);
  expect(cls).not.toMatch(/nav-ready/);
  expect(cls).not.toMatch(/search-ready/);
  await expect(page.locator("#topbar button")).toHaveCount(0);
  expect(await page.locator("#nav").getAttribute("popover")).toBeNull();
  await expect(page.locator("#nav")).toBeVisible();
  const links = page.locator("#nav li > ul a");
  const n = await links.count();
  for (let i = 0; i < n; i++) await expect(links.nth(i)).toBeVisible();
});

// The active stage is the stage that holds the viewport midline, not the stage of the telemetry card.
test("e2e-nav-stage-follows-midline", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const bad: string[] = [];
  for (let y = 0; y <= height; y += 150) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
    await frames(page);
    const r = await page.evaluate(() => {
      const mid = window.innerHeight / 2;
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const secs = [...document.querySelectorAll<HTMLElement>("section.stage, #skills, #contact")];
      let want = "#top";
      for (const s of secs) if (s.getBoundingClientRect().top <= mid) want = `#${s.id}`;
      if (window.scrollY <= 0) want = "#top";
      if (atEnd) want = "#contact";
      const loc = document.querySelector('#nav a[aria-current="location"]');
      return { want, got: loc?.getAttribute("href") ?? null, y: window.scrollY };
    });
    if (r.want !== r.got) bad.push(`scroll ${r.y}: want ${r.want}, got ${r.got}`);
  }
  expect(bad).toEqual([]);
});
