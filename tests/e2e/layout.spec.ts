import { test, expect, type Page } from "@playwright/test";

const WIDTHS = [360, 768, 1024, 1280, 1920, 2560];
const RAIL_WIDTHS = [1265, 1280, 1440, 1920, 2560];

// Leaf text elements: own a non-empty text node, not visually hidden.
const COLLECT_TEXT = `(() => {
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  for (let el = walker.nextNode(); el; el = walker.nextNode()) {
    if (["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "svg"].includes(el.tagName)) continue;
    if (el.closest("svg")) continue;
    if (el.closest(".visually-hidden")) continue;
    const det = el.closest("details:not([open])");
    if (det && !el.closest("summary")) continue;
    if (el.classList.contains("skip-link") && document.activeElement !== el) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== "");
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    out.push(el);
  }
  return out;
})()`;

async function openAt(page: Page, width: number, height = 800, url = "/") {
  await page.setViewportSize({ width, height });
  await page.goto(url);
}

test("e2e-layout-no-hscroll", async ({ page }) => {
  for (const w of WIDTHS) {
    await openAt(page, w);
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
    }));
    expect(m.sw, `width ${w}`).toBeLessThanOrEqual(m.iw);
  }
});

test("e2e-line-length-2560", async ({ page }) => {
  await openAt(page, 2560, 1400);
  const worst = await page.evaluate(`(() => {
    const els = ${COLLECT_TEXT};
    let max = { n: 0, text: "" };
    for (const el of els) {
      const lines = new Map();
      for (const node of el.childNodes) {
        if (node.nodeType !== 3) continue;
        const text = node.textContent;
        for (let i = 0; i < text.length; i++) {
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const rects = range.getClientRects();
          if (rects.length === 0) continue;
          const key = Math.round(rects[0].top);
          lines.set(key, (lines.get(key) ?? "") + text[i]);
        }
      }
      for (const [, s] of lines) {
        const n = s.trim().length;
        if (n > max.n) max = { n, text: s.trim().slice(0, 40) };
      }
    }
    return max;
  })()`);
  expect((worst as { n: number }).n, JSON.stringify(worst)).toBeLessThanOrEqual(80);
  expect((worst as { n: number }).n).toBeGreaterThan(20);
});

test("e2e-no-text-overlap", async ({ page }) => {
  for (const w of WIDTHS) {
    await openAt(page, w, 900);
    const hits = await page.evaluate(`(() => {
      const els = ${COLLECT_TEXT};
      const all = [...els];
      // Boxes of the telemetry panel, the rail and the topbar count too (TG-08).
      for (const sel of [".telemetry", ".nav", ".topbar"]) {
        const el = document.querySelector(sel);
        if (!el || getComputedStyle(el).display === "none") continue;
        if (!all.includes(el)) all.push(el);
      }
      const rects = all.map((el) => ({ el, r: el.getBoundingClientRect() }));
      const bad = [];
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], b = rects[j];
          if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
          const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
          const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
          if (x > 0.5 && y > 0.5) bad.push(a.el.tagName + "." + a.el.className + ":" + (a.el.textContent || "").slice(0, 20) + " | " + b.el.tagName + "." + b.el.className + ":" + (b.el.textContent || "").slice(0, 20));
        }
      }
      return bad;
    })()`);
    expect(hits, `width ${w}`).toEqual([]);
  }
});

test("e2e-rail-1280-no-overlap", async ({ page }) => {
  for (const w of RAIL_WIDTHS) {
    await openAt(page, w, 900);
    for (const y of [0, 1500]) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      const r = (await page.evaluate(`(() => {
        const boxes = [];
        const add = (name, el) => {
          if (!el || getComputedStyle(el).display === "none") return;
          const r = el.getBoundingClientRect();
          boxes.push({ name, l: r.left, r: r.right, t: r.top, b: r.bottom });
        };
        add("rail", document.querySelector("#nav"));
        add("telemetry", document.querySelector(".telemetry"));
        add("trajectory", document.querySelector(".trajectory"));
        document.querySelectorAll(".hero > *").forEach((e, i) => add("hero" + i, e));
        document.querySelectorAll(".stage").forEach((e, i) => add("stage" + i, e));
        const bad = [];
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i], b = boxes[j];
            const x = Math.min(a.r, b.r) - Math.max(a.l, b.l);
            const yy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
            if (x > 0.5 && yy > 0.5) bad.push(a.name + " | " + b.name);
          }
        }
        return { bad, rail: boxes.some((b) => b.name === "rail"), sw: document.documentElement.scrollWidth, iw: innerWidth };
      })()`)) as { bad: string[]; rail: boolean; sw: number; iw: number };
      expect(r.bad, `width ${w} scroll ${y}`).toEqual([]);
      expect(r.sw, `width ${w}`).toBeLessThanOrEqual(r.iw);
      if (w >= 1280) expect(r.rail, `rail shows at ${w}`).toBe(true);
    }
  }
});

test("e2e-rail-sticky-scrolls", async ({ page }) => {
  await openAt(page, 1280, 600);
  const css = await page.evaluate(() => {
    const n = getComputedStyle(document.querySelector("#nav")!);
    return { pos: n.position, oy: n.overflowY };
  });
  expect(css.pos).toBe("sticky");
  expect(css.oy).toBe("auto");
  for (const y of [0, 800, 3000, 100000]) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    const b = await page.evaluate(() => {
      const r = document.querySelector("#nav")!.getBoundingClientRect();
      return { t: r.top, b: r.bottom, h: innerHeight };
    });
    expect(b.t, `scroll ${y}`).toBeGreaterThanOrEqual(0);
    expect(b.b, `scroll ${y}`).toBeLessThanOrEqual(b.h);
  }
});

test("e2e-nav-visible-without-nav-ready-1024", async ({ page }) => {
  // The module cannot load. After load the head script removes "js", so the plain list shows.
  await page.route("**/*.js", (r) => r.abort());
  await openAt(page, 1024, 800);
  await page.waitForLoadState("load");
  const m = await page.evaluate(() => ({
    js: document.documentElement.classList.contains("js"),
    ready: document.documentElement.classList.contains("nav-ready"),
    display: getComputedStyle(document.querySelector("#nav")!).display,
  }));
  expect(m.js).toBe(false);
  expect(m.ready).toBe(false);
  expect(m.display).not.toBe("none");
  await expect(page.locator("#nav a").first()).toBeVisible();
});

test("e2e-bar-height", async ({ page }) => {
  await openAt(page, 360, 640);
  const m = await page.evaluate(() => {
    const t = document.querySelector(".telemetry")!;
    return { h: t.getBoundingClientRect().height, pos: getComputedStyle(t).position };
  });
  expect(m.pos).toBe("fixed");
  expect(m.h).toBeLessThanOrEqual(56);
});

// In-view text and controls against the telemetry rect.
// With a target id, text above the target scrolls under the bar as normal scrolling.
// So only the target and the text from its top downward are checked.
async function intersectsTelemetry(page: Page, targetId = ""): Promise<string[]> {
  return page.evaluate(`(() => {
    const target = document.getElementById(${JSON.stringify(targetId)});
    const targetTop = target ? target.getBoundingClientRect().top : -Infinity;
    const t = document.querySelector(".telemetry").getBoundingClientRect();
    const els = ${COLLECT_TEXT}.filter((el) => !el.closest(".telemetry"));
    const bad = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= window.innerHeight) continue;
      if (r.top < targetTop - 0.5) continue;
      const x = Math.min(r.right, t.right) - Math.max(r.left, t.left);
      const y = Math.min(r.bottom, t.bottom) - Math.max(r.top, t.top);
      if (x > 0.5 && y > 0.5) bad.push(el.tagName + ":" + (el.textContent || "").slice(0, 30));
    }
    return bad;
  })()`);
}

test("e2e-bar-covers-no-text", async ({ page }) => {
  for (const w of [360, 767, 768]) {
    await openAt(page, w, 700);
    // Case 1: page top.
    expect(await intersectsTelemetry(page), `page top ${w}`).toEqual([]);

    // Case 2: each stage and card hash.
    const ids = await page.evaluate(() =>
      [...document.querySelectorAll("section.stage, article.card")].map((e) => e.id),
    );
    expect(ids.length).toBeGreaterThanOrEqual(8);
    for (const id of ids) {
      await page.goto(`/#${id}`);
      await page.waitForTimeout(50);
      expect(await intersectsTelemetry(page, id), `hash ${id} @${w}`).toEqual([]);
    }

    // Case 3: Tab to each control; its top is at or below the bar bottom.
    await page.goto("/");
    const count = await page.evaluate(
      () =>
        [...document.querySelectorAll("a[href], summary, button, [tabindex]:not([tabindex='-1'])")].filter(
          (e) => e.getClientRects().length > 0,
        ).length,
    );
    const barBottom = () =>
      page.evaluate(() => {
        const t = document.querySelector(".telemetry")!;
        const r = t.getBoundingClientRect();
        return getComputedStyle(t).position === "fixed" && r.left < 100 && r.width > window.innerWidth / 2
          ? r.bottom
          : 0;
      });
    for (let i = 0; i < count; i++) {
      await page.keyboard.press("Tab");
      // Controls in the top bar are part of the bar and sit in it by design.
      const top = await page.evaluate(() =>
        document.activeElement!.closest("#topbar") ? Infinity : document.activeElement!.getBoundingClientRect().top,
      );
      expect(top, `stop ${i} @${w}`).toBeGreaterThanOrEqual((await barBottom()) - 0.5);
    }

    // Case 4: padding and scroll padding below 768 px.
    if (w < 768) {
      const m = await page.evaluate(() => ({
        bar: document.querySelector(".telemetry")!.getBoundingClientRect().height,
        pad: parseFloat(getComputedStyle(document.body).paddingTop),
        scroll: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
      }));
      expect(m.pad).toBeGreaterThanOrEqual(m.bar);
      expect(m.scroll).toBeGreaterThanOrEqual(m.bar);
    }
  }
});

test("e2e-bar-fits-every-role-360", async ({ page }) => {
  for (const w of [360, 375]) {
    await openAt(page, w, 700);
    const ids = await page.evaluate(() => [...document.querySelectorAll("article.card")].map((e) => e.id));
    expect(ids.length).toBeGreaterThanOrEqual(8);
    for (const id of ids) {
      await page.goto(`/#${id}`);
      await page.waitForTimeout(50);
      const m = await page.evaluate(() => {
        const bar = document.querySelector(".telemetry")!.getBoundingClientRect();
        const dl = document.querySelector(".telemetry dl")!.getBoundingClientRect();
        const lines = [...document.querySelectorAll<HTMLElement>(".telemetry dt, .telemetry dd")]
          .filter((el) => !el.closest(".visually-hidden") && el.getBoundingClientRect().width > 2 && getComputedStyle(el).display !== "none")
          .filter((el) => !(el.tagName === "DT" && el.getBoundingClientRect().width <= 2))
          .map((el) => {
            const cs = getComputedStyle(el);
            return {
              name: el.tagName + ":" + (el.textContent ?? "").slice(0, 24),
              rows: Math.round(el.getBoundingClientRect().height / parseFloat(cs.lineHeight)),
            };
          });
        return { barH: bar.height, barBottom: bar.bottom, dlBottom: dl.bottom, lines, sw: document.documentElement.scrollWidth };
      });
      expect(m.barH, `${id} @${w}`).toBeLessThanOrEqual(56);
      expect(m.dlBottom, `${id} @${w} content inside bar`).toBeLessThanOrEqual(m.barBottom + 0.5);
      for (const l of m.lines) expect(l.rows, `${id} @${w} ${l.name}`).toBe(1);
      expect(m.sw).toBeLessThanOrEqual(w);
      expect(await intersectsTelemetry(page, id), `${id} @${w} overlap`).toEqual([]);
    }
  }
});

test("e2e-cls-under-0-1", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y <= h; y += 300) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
  });
  await page.waitForTimeout(300);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls).toBeLessThan(0.1);
});

test("e2e-zoom-200-no-clip", async ({ page }) => {
  await openAt(page, 1280, 800);
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  const m = await page.evaluate(`(() => {
    const clipped = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest(".visually-hidden") || el.closest("svg")) continue;
      if (el.classList.contains("skip-link") && document.activeElement !== el) continue;
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
        clipped.push(el.tagName + "." + el.className);
      }
    }
    return { clipped, sw: document.documentElement.scrollWidth, iw: window.innerWidth };
  })()`);
  const r = m as { clipped: string[]; sw: number; iw: number };
  expect(r.sw).toBeLessThanOrEqual(r.iw);
  expect(r.clipped).toEqual([]);
});

test("e2e-landscape-short", async ({ page }) => {
  await openAt(page, 768, 500);
  const focusDisplay = await page.evaluate(() => {
    const dd = document.querySelector(".telemetry [data-t='focus']")!;
    return getComputedStyle(dd.parentElement!).display;
  });
  expect(focusDisplay).toBe("none");
  const others = await page.evaluate(() =>
    ["stage", "role", "years", "team"].map((k) => {
      const dd = document.querySelector(`.telemetry [data-t='${k}']`)!;
      return getComputedStyle(dd.parentElement!).display;
    }),
  );
  for (const d of others) expect(d).not.toBe("none");

  await openAt(page, 640, 360);
  const pos = await page.evaluate(() => getComputedStyle(document.querySelector(".telemetry")!).position);
  expect(pos).toBe("static");
});

for (const [w, h] of [
  [768, 1024],
  [1024, 768],
] as const) {
  test(`e2e-cls-delayed-script-${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
          if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.route("**/assets/*.js", async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.goto("/");
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.1);
  });
}

test("e2e-zoom-200-contents-fallback", async ({ page }) => {
  // 1280 px at 200 percent zoom is a 640 px viewport.
  await page.setViewportSize({ width: 640, height: 400 });
  await page.goto("/");
  await page.waitForSelector("html.js.nav-ready");
  const btn = page.locator("#topbar button.contents-btn");
  await expect(btn).toBeVisible();
  await expect(page.locator("#nav")).toBeHidden();
  await btn.click();
  await expect(page.locator("#nav")).toBeVisible();
  const sw = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(sw).toBe(true);
});
