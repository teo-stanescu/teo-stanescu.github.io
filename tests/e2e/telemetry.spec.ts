import { test, expect, type Page } from "@playwright/test";

const ROLE = '.telemetry [data-t="role"]';

async function ready(page: Page, url = "/") {
  await page.goto(url);
  await page.waitForSelector("html.js");
}

type Probe = {
  title: string;
  ms: number;
  stage: string;
  role: string;
  years: string;
  team: string;
  teamGlyph: boolean;
  state: string;
  attrStage: string;
  attrYears: string;
};

// Scroll one card to the midline and time the panel update inside the page.
async function probeCard(page: Page, index: number): Promise<Probe> {
  return page.evaluate(
    async ({ index, ROLE }) => {
      const cards = [...document.querySelectorAll<HTMLElement>("article.card")];
      const card = cards[index];
      const roleEl = document.querySelector(ROLE) as HTMLElement;
      const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
      // Move the midline to another card first, so the role text must change.
      if (roleEl.textContent === card.dataset.role) {
        const other = cards[index === 0 ? 1 : index - 1];
        other.scrollIntoView({ block: "center", behavior: "instant" });
        await new Promise((r) => setTimeout(r, 150));
        await frame();
      }
      const ms = await new Promise<number>((resolve) => {
        const mo = new MutationObserver(() => {
          mo.disconnect();
          resolve(performance.now() - t0);
        });
        mo.observe(roleEl, { childList: true, characterData: true, subtree: true });
        const t0 = performance.now();
        card.scrollIntoView({ block: "center", behavior: "instant" });
        setTimeout(() => {
          mo.disconnect();
          resolve(Infinity);
        }, 2000);
      });
      const t = (k: string) => document.querySelector(`.telemetry [data-t="${k}"]`) as HTMLElement;
      return {
        title: card.querySelector("h3")!.textContent!,
        ms,
        stage: t("stage").textContent!,
        role: t("role").textContent!,
        years: t("years").textContent!,
        team: t("team").textContent!,
        teamGlyph: !!t("team").querySelector('[aria-hidden="true"]'),
        state: t("state").textContent!,
        attrStage: card.dataset.stage!,
        attrYears: card.dataset.years!,
      };
    },
    { index, ROLE },
  );
}

function checkProbe(p: Probe) {
  expect(p.ms, `${p.title} update time`).toBeLessThanOrEqual(200);
  expect(p.role).toBe(p.title);
  expect(p.stage).toBe(p.attrStage);
  expect(p.years).toBe(p.attrYears);
  expect(p.state).toBe("In view");
  const team: Record<string, string> = { "Principal Engineer": "up to 12", "Solution Architect": "up to 6", "Tech Lead": "5" };
  if (team[p.title]) {
    expect(p.team).toBe(team[p.title]);
    expect(p.teamGlyph).toBe(false);
  } else {
    expect(p.teamGlyph).toBe(true);
    expect(p.team).toContain("—");
  }
  if (p.title === "Principal Engineer") expect(p.years.endsWith("Present")).toBe(true);
}

test("e2e-telemetry-midline-200ms", async ({ page }) => {
  for (const width of [768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    const n = await page.locator("article.card").count();
    expect(n).toBeGreaterThan(5);
    const order = [...Array(n).keys()];
    const seen: string[] = [];
    // Top to bottom, then bottom to top (E-08).
    for (const i of [...order, ...[...order].reverse()]) {
      const p = await probeCard(page, i);
      checkProbe(p);
      seen.push(p.title);
    }
    expect(seen).toContain("Principal Engineer");
    const hyper = page.locator("article.card", { hasText: "Hyperpanda" });
    const idx = await page.locator("article.card").evaluateAll(
      (els) => els.findIndex((e) => e.textContent?.includes("Hyperpanda")),
    );
    expect((await probeCard(page, idx)).years).toBe("Oct 2017");
    await expect(hyper).toHaveAttribute("data-years", "Oct 2017");
  }
});

test("e2e-telemetry-focus", async ({ page }) => {
  await ready(page);
  const total = await page.locator("article.card summary").count();
  let seen = 0;
  for (let i = 0; i < 80 && seen < total; i++) {
    await page.keyboard.press("Tab");
    const title = await page.evaluate(() => {
      const a = document.activeElement;
      return a?.tagName === "SUMMARY" ? a.closest("article")!.querySelector("h3")!.textContent : null;
    });
    if (title === null) continue;
    seen++;
    await expect(page.locator(ROLE)).toHaveText(title);
  }
  expect(seen).toBe(total);
});

test("e2e-telemetry-anchor-load", async ({ page }) => {
  await ready(page, "/#stage-3");
  await expect(page.locator('.telemetry [data-t="stage"]')).toHaveText("3 - Orbit");
  await expect(page.locator(ROLE)).toHaveText("Solution Architect");
});

test("e2e-unknown-hash-idle", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page, "/#nothing");
  await page.waitForTimeout(200);
  await expect(page.locator(ROLE)).toHaveText("Principal Engineer");
  await expect(page.locator('.telemetry [data-t="state"]')).toHaveText("Current");
  expect(errors).toEqual([]);
});

test("e2e-script-blocked-keeps-page", async ({ page }) => {
  await page.route("**/*.js", (r) => r.abort());
  await page.goto("/");
  // The inline head script sets "js" before paint. The blocked module leaves the idle panel.
  await expect(page.locator(ROLE)).toHaveText("Principal Engineer");
  await expect(page.locator('.telemetry [data-t="state"]')).toHaveText("Current");
  const n = await page.locator("article.card").count();
  expect(n).toBeGreaterThan(5);
  for (let i = 0; i < n; i++) await expect(page.locator("article.card").nth(i)).toBeVisible();
});

// Title of the card under the midline, the last card above it, or null above the first card.
async function expectedRole(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const mid = window.innerHeight / 2;
    let cur: Element | null = null;
    for (const c of document.querySelectorAll("article.card")) {
      const r = c.getBoundingClientRect();
      if (r.top > mid) break;
      cur = c;
      if (r.bottom > mid) break;
    }
    return cur ? cur.querySelector("h3")!.textContent : null;
  });
}
const STATE = '.telemetry [data-t="state"]';

test("e2e-telemetry-between-stages", async ({ page }) => {
  await ready(page);
  for (const id of ["stage-1", "stage-2", "stage-3"]) {
    await page.evaluate((id) => {
      const h2 = document.getElementById(id)!.querySelector("h2")!;
      window.scrollTo(0, h2.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2);
    }, id);
    await page.waitForTimeout(150);
    const want = await expectedRole(page);
    expect(want).not.toBeNull();
    await expect(page.locator(STATE)).toHaveText("In view");
    await expect(page.locator(ROLE)).toHaveText(want!);
  }
});

test("e2e-telemetry-end-and-top", async ({ page }) => {
  await ready(page);
  await page.bringToFront();
  await page.keyboard.press("End");
  await page.waitForFunction(
    () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
    undefined,
    { polling: 50 },
  );
  await expect(page.locator(STATE)).toHaveText("In view");
  await expect(page.locator(ROLE)).toHaveText(
    (await page.locator("article.card h3").last().textContent())!,
  );
  // Chromium can drop a key that arrives while the End scroll animation settles, so retry.
  await expect(async () => {
    await page.keyboard.press("Home");
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  }).toPass({ timeout: 10_000 });
  await expect(page.locator(STATE)).toHaveText("Current");
});

test("e2e-telemetry-hashchange-then-wheel", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    location.hash = "#stage-1";
  });
  await expect(page.locator(ROLE)).toHaveText("Software Test Engineer");
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 2500);
  await page.waitForTimeout(400);
  await expect(page.locator(ROLE)).toHaveText((await expectedRole(page))!);
  await expect(page.locator(ROLE)).not.toHaveText("Software Test Engineer");
});

test("e2e-telemetry-pointerdown-unlocks", async ({ page }) => {
  await ready(page, "/#stage-1");
  await expect(page.locator(ROLE)).toHaveText("Software Test Engineer");
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(300);
  await expect(page.locator(ROLE)).toHaveText("Software Test Engineer");
  await page.mouse.move(5, 5);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator(ROLE)).toHaveText((await expectedRole(page))!);
});

test("e2e-telemetry-main-hash-ignored", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    location.hash = "#main";
  });
  await page.evaluate(() => window.scrollTo(0, 2600));
  await page.waitForTimeout(300);
  await expect(page.locator(ROLE)).toHaveText((await expectedRole(page))!);
});

test("e2e-telemetry-resize", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await ready(page);
  await page.evaluate(() => window.scrollTo(0, 2200));
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(300);
  await expect(page.locator(ROLE)).toHaveText((await expectedRole(page))!);
  await expect(page.locator(".telemetry")).toHaveCSS("position", "fixed");
});
