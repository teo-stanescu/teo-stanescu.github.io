import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
}

test("e2e-axe-both-themes", async ({ page }) => {
  for (const scheme of ["dark", "light"] as const) {
    {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/");
      expect(await axe(page), `${scheme} 1280`).toEqual([]);

      await page.setViewportSize({ width: 360, height: 640 });
      await page.goto("/");
      expect(await axe(page), `${scheme} 360`).toEqual([]);

      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/");
      await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
      expect(await axe(page), `${scheme} details open`).toEqual([]);

      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      expect(await axe(page), `${scheme} reduced motion`).toEqual([]);
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
  }
});

// WCAG relative luminance contrast, run in the page.
const CONTRAST_FN = `
  const parse = (s) => {
    const m = s.match(/rgba?\\(([^)]+)\\)/);
    const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgBehind = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c.a > 0) return c;
    }
    return parse(getComputedStyle(document.body).backgroundColor);
  };
`;

test("e2e-nontext-contrast-both-themes", async ({ page }) => {
  for (const scheme of ["dark", "light"] as const) {
    {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/");
      const results = await page.evaluate(`(() => {
        ${CONTRAST_FN}
        const out = {};
        const summary = document.querySelector("summary");
        const sec = document.querySelector("a.btn-secondary");
        out.summaryBorder = ratio(parse(getComputedStyle(summary).borderTopColor), bgBehind(summary.parentElement));
        out.secondaryBorder = ratio(parse(getComputedStyle(sec).borderTopColor), bgBehind(sec.parentElement));
        const track = document.querySelector(".trajectory .track");
        const drawn = document.querySelector(".trajectory .drawn");
        const bg = parse(getComputedStyle(document.body).backgroundColor);
        out.track = ratio(parse(getComputedStyle(track).stroke), bg);
        out.drawn = ratio(parse(getComputedStyle(drawn).stroke), bg);
        summary.focus({ focusVisible: true });
        const ring = getComputedStyle(summary);
        out.ringSummary = ratio(parse(ring.outlineColor), bgBehind(summary.parentElement));
        sec.focus({ focusVisible: true });
        out.ringButton = ratio(parse(getComputedStyle(sec).outlineColor), bgBehind(sec.parentElement));
        return out;
      })()`);
      for (const [k, v] of Object.entries(results as Record<string, number>)) {
        expect(v, `${scheme} ${k}`).toBeGreaterThanOrEqual(3);
      }
    }
  }
});

test("e2e-tab-order-visual", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const stops = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("a[href], summary, button, [tabindex]:not([tabindex='-1'])")].map(
      (e, i) => {
        const r = e.getBoundingClientRect();
        return {
          i,
          skip: e.classList.contains("skip-link"),
          nav: !!e.closest("nav"),
          top: r.top + window.scrollY,
          left: r.left + window.scrollX,
        };
      },
    ),
  );
  expect(stops[0].skip).toBe(true);
  // Visual order: skip link, the left rail (top to bottom), then the hero buttons and content.
  const byPos = (a: { top: number; left: number }, b: { top: number; left: number }) =>
    a.top - b.top || a.left - b.left;
  const rail = stops.filter((s) => s.nav).sort(byPos);
  expect(rail.length).toBeGreaterThanOrEqual(15);
  const rest = stops.filter((s) => !s.skip && !s.nav).sort(byPos);
  const expected = [...rail, ...rest].map((s) => s.i);
  const seen: number[] = [];
  for (let n = 0; n < stops.length; n++) {
    await page.keyboard.press("Tab");
    seen.push(
      await page.evaluate(() => {
        const all = [...document.querySelectorAll("a[href], summary, button, [tabindex]:not([tabindex='-1'])")];
        return all.indexOf(document.activeElement!);
      }),
    );
  }
  expect(seen.length).toBe(stops.length);
  expect(seen[0]).toBe(stops.findIndex((s) => s.skip));
  expect(seen.slice(1)).toEqual(expected);
});

test("e2e-focus-visible", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const count = await page.evaluate(
    () => document.querySelectorAll("a[href], summary, button, [tabindex]:not([tabindex='-1'])").length,
  );
  for (let i = 0; i < count; i++) {
    await page.keyboard.press("Tab");
    const o = await page.evaluate(() => {
      const cs = getComputedStyle(document.activeElement!);
      return { w: cs.outlineWidth, s: cs.outlineStyle };
    });
    expect(o.w, `stop ${i}`).toBe("3px");
    expect(o.s, `stop ${i}`).not.toBe("none");
  }
});
