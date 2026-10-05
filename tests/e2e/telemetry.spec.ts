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
  const team: Record<string, string> = { "Principal Engineer": "12", "Solution Architect": "6", "Tech Lead": "5" };
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
  const n = await page.locator("article.card").count();
  for (let i = 0; i < n; i++) {
    const card = page.locator("article.card").nth(i);
    const title = (await card.locator("h3").textContent())!;
    const summary = card.locator("summary");
    if ((await summary.count()) === 0) continue;
    await summary.focus();
    await expect(page.locator(ROLE)).toHaveText(title);
  }
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
  await expect(page.locator("html")).not.toHaveClass(/js/);
  await expect(page.locator(ROLE)).toHaveText("Principal Engineer");
  await expect(page.locator('.telemetry [data-t="state"]')).toHaveText("Current");
  const n = await page.locator("article.card").count();
  expect(n).toBeGreaterThan(5);
  for (let i = 0; i < n; i++) await expect(page.locator("article.card").nth(i)).toBeVisible();
});
