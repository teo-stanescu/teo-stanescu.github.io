import { test, expect, type Page } from "@playwright/test";

// Scroll is instant under reduced motion, so checks after a jump need no waiting for a smooth scroll.
test.use({ reducedMotion: "reduce" });

async function ready(page: Page, width = 1280, height = 800) {
  await page.setViewportSize({ width, height });
  await page.goto("/");
  await page.waitForSelector("html.js.search-ready");
}

const box = (page: Page) => page.getByRole("combobox");
const options = (page: Page) => page.getByRole("option");
const counter = (page: Page) => page.locator(".search-count");

async function type(page: Page, q: string) {
  await box(page).fill("");
  await box(page).pressSequentially(q);
}

// Independent count of case-insensitive matches in the text the search must cover.
async function expectedCount(page: Page, q: string): Promise<number> {
  return page.evaluate((query) => {
    const skip = ".telemetry, nav, .topbar, [aria-hidden='true'], .visually-hidden, .skip-link";
    let n = 0;
    for (const scope of document.querySelectorAll(".hero, main, footer")) {
      const w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
      for (let t = w.nextNode(); t; t = w.nextNode()) {
        if ((t.parentElement as Element).closest(skip)) continue;
        const text = (t.textContent ?? "").toLowerCase();
        for (let at = text.indexOf(query); at >= 0; at = text.indexOf(query, at + query.length)) n++;
      }
    }
    return n;
  }, q.toLowerCase());
}

const hlSize = (page: Page, name: string) =>
  page.evaluate((n) => ("highlights" in CSS ? (CSS.highlights.get(n)?.size ?? 0) : -1), name);

test("e2e-search-top-bar", async ({ page }) => {
  await ready(page, 1024);
  const m = await page.evaluate(() => {
    const bar = document.getElementById("topbar")!.getBoundingClientRect();
    const i = document.querySelector<HTMLInputElement>("#topbar input")!;
    const r = i.getBoundingClientRect();
    return {
      barH: bar.height,
      barTop: bar.top,
      inside: r.top >= bar.top && r.bottom <= bar.bottom,
      placeholder: i.placeholder,
      sticky: getComputedStyle(document.getElementById("topbar")!).position,
    };
  });
  expect(m.barH).toBeLessThanOrEqual(48);
  expect(m.inside).toBe(true);
  expect(m.sticky).toBe("fixed");
  expect(m.placeholder).toBe("Search the page (press /)");
  await page.evaluate(() => window.scrollTo(0, 900));
  expect((await page.locator("#topbar").boundingBox())!.y).toBe(0);
});

test("e2e-search-slash-key", async ({ page }) => {
  await ready(page);
  await page.keyboard.press("/");
  await expect(box(page)).toBeFocused();
  await expect(box(page)).toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(box(page)).not.toBeFocused();

  for (const tag of ["input", "textarea", "div"]) {
    await page.evaluate((t) => {
      const e = document.createElement(t);
      e.id = "extra";
      if (t === "div") e.setAttribute("contenteditable", "true");
      document.body.append(e);
      e.focus();
    }, tag);
    await page.keyboard.press("/");
    await expect(page.locator("#extra")).toBeFocused();
    await expect(box(page)).not.toBeFocused();
    if (tag === "div") expect(await page.locator("#extra").textContent()).toBe("/");
    await page.evaluate(() => document.getElementById("extra")!.remove());
  }

  for (const mod of ["Control", "Alt", "Meta"]) {
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await page.keyboard.press(`${mod}+/`);
    await expect(box(page)).not.toBeFocused();
  }
});

test("e2e-search-list-100ms", async ({ page }) => {
  await ready(page);
  await page.keyboard.press("/");
  await page.evaluate(() => {
    const w = window as unknown as { __last: number; __upd: number };
    const input = document.querySelector("#search-input")!;
    input.addEventListener("input", () => (w.__last = performance.now()));
    new MutationObserver(() => (w.__upd = performance.now())).observe(
      document.getElementById("search-list")!,
      { childList: true },
    );
  });
  await page.keyboard.type("nodejs");
  await expect(counter(page)).toHaveText(`1 of ${await expectedCount(page, "nodejs")}`);
  await expect(options(page)).toHaveCount(3);
  // The list updates after the last key. Poll until that update has run, then read the delay.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const w = window as unknown as { __last: number; __upd: number };
        return w.__upd >= w.__last;
      }),
    )
    .toBe(true);
  const d = await page.evaluate(() => {
    const w = window as unknown as { __last: number; __upd: number };
    return w.__upd - w.__last;
  });
  expect(d).toBeGreaterThanOrEqual(0);
  expect(d).toBeLessThanOrEqual(100);
  // One option for each section, in page order, with a heading and a short snippet.
  const rows = await options(page).evaluateAll((os) =>
    os.map((o) => ({
      title: o.querySelector(".search-opt-title")!.textContent!,
      snip: o.querySelector(".search-opt-snip")!.textContent!,
      mark: o.querySelector("mark")!.textContent!.toLowerCase(),
    })),
  );
  for (const r of rows) {
    expect(r.title.length).toBeGreaterThan(0);
    expect(r.snip.length).toBeLessThanOrEqual(80);
    expect(r.mark).toBe("nodejs");
  }
  const order = await page.evaluate((titles) => {
    const hs = [...document.querySelectorAll("main h2, main h3")].map((h) => h.textContent);
    return titles.map((t) => hs.indexOf(t));
  }, rows.map((r) => r.title));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  expect(order.every((i) => i >= 0)).toBe(true);
});

test("e2e-search-choose-result", async ({ page }) => {
  await ready(page);
  const check = async () => {
    await expect(page.locator("#search-list")).toBeHidden();
    const m = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement;
      const bar = document.getElementById("topbar")!.getBoundingClientRect().bottom;
      const h = CSS.highlights.get("search-active")!;
      const r = [...h][0] as Range;
      const group = a.closest("article.card, section, header.hero, footer")!;
      // First text node of the group that holds the query.
      const w = document.createTreeWalker(group, NodeFilter.SHOW_TEXT);
      let first: Node | null = null;
      for (let t = w.nextNode(); t && !first; t = w.nextNode()) {
        if ((t.textContent ?? "").toLowerCase().includes("nodejs")) first = t;
      }
      return {
        tag: a.tagName,
        tabindex: a.getAttribute("tabindex"),
        top: a.getBoundingClientRect().top,
        bar,
        inGroup: group.contains(r.startContainer),
        isFirst: r.startContainer === first,
        size: h.size,
      };
    });
    expect(m.tag).toMatch(/^H[1-3]$/);
    expect(m.tabindex).toBe("-1");
    expect(m.top).toBeGreaterThanOrEqual(m.bar);
    expect(m.inGroup).toBe(true);
    expect(m.isFirst).toBe(true);
    expect(m.size).toBe(1);
  };

  await type(page, "nodejs");
  await expect(options(page)).toHaveCount(3);
  await page.keyboard.press("ArrowDown");
  const first = options(page).first();
  await expect(first).toHaveAttribute("aria-selected", "true");
  const name = await first.locator(".search-opt-title").textContent();
  await page.keyboard.press("Enter");
  await check();
  expect(await page.evaluate(() => document.activeElement!.textContent)).toBe(name);

  await page.keyboard.press("/");
  await type(page, "nodejs");
  await options(page).nth(1).click();
  await check();
});

test("e2e-search-highlights-counter", async ({ page }) => {
  await ready(page);
  await type(page, "architecture");
  const n = await expectedCount(page, "architecture");
  expect(n).toBeGreaterThan(3);
  await expect(counter(page)).toHaveText(`1 of ${n}`);
  await expect(counter(page)).toHaveAttribute("aria-live", "polite");
  expect(await hlSize(page, "search-all")).toBe(n);
  expect(await hlSize(page, "search-active")).toBe(1);
  // The active match is also in the full set, so the style differs only through priority.
  expect(await page.evaluate(() => CSS.highlights.get("search-active")!.priority)).toBeGreaterThan(
    await page.evaluate(() => CSS.highlights.get("search-all")!.priority),
  );
});

test("e2e-search-next-prev-wrap", async ({ page }) => {
  await ready(page);
  await type(page, "nodejs");
  const n = await expectedCount(page, "nodejs");
  expect(n).toBeGreaterThanOrEqual(3);
  const at = (k: number) => expect(counter(page)).toHaveText(`${k} of ${n}`);
  await at(1);
  await page.keyboard.press("Enter");
  await at(2);
  await page.keyboard.press("Shift+Enter");
  await at(1);
  await page.keyboard.press("Shift+Enter");
  await at(n);
  await page.keyboard.press("Enter");
  await at(1);
  await page.getByRole("button", { name: "Next" }).click();
  await at(2);
  await page.getByRole("button", { name: "Previous" }).click();
  await at(1);
  await page.getByRole("button", { name: "Previous" }).click();
  await at(n);
  await page.getByRole("button", { name: "Next" }).click();
  await at(1);
  // The active match is in view after a jump.
  await page.keyboard.press("Enter");
  const inView = await page.evaluate(() => {
    const r = ([...CSS.highlights.get("search-active")!][0] as Range).getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  });
  expect(inView).toBe(true);
});

test("e2e-search-details-open-close", async ({ page }) => {
  await ready(page);
  const d = page.locator("details", { hasText: "idempotency" });
  await expect(d).not.toHaveJSProperty("open", true);
  await type(page, "idempotency");
  await page.keyboard.press("Enter");
  await expect(d).toHaveJSProperty("open", true);
  const visible = await page.evaluate(() => {
    const r = ([...CSS.highlights.get("search-active")!][0] as Range).getBoundingClientRect();
    return r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
  });
  expect(visible).toBe(true);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(d).not.toHaveJSProperty("open", true);

  // A Details the user opened stays open.
  await d.locator("summary").click();
  await expect(d).toHaveJSProperty("open", true);
  await page.keyboard.press("/");
  await type(page, "idempotency");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(d).toHaveJSProperty("open", true);
});

test("e2e-search-no-match", async ({ page }) => {
  await ready(page);
  await type(page, "zzzzqq");
  await expect(page.locator(".search-pop")).toContainText("No matches");
  await expect(options(page)).toHaveCount(0);
  await expect(counter(page)).toHaveText("0 of 0");
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
  expect(await hlSize(page, "search-all")).toBe(0);
});

test("e2e-search-escape-sequence", async ({ page }) => {
  await ready(page);
  const link = page.locator(".hero-actions a").first();
  await link.focus();
  await page.keyboard.press("/");
  await type(page, "nodejs");
  await expect(options(page)).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(page.locator(".search-pop")).toBeHidden();
  await expect(box(page)).toHaveValue("nodejs");
  expect(await hlSize(page, "search-all")).toBeGreaterThan(0);
  await expect(box(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(box(page)).toHaveValue("");
  expect(await hlSize(page, "search-all")).toBe(0);
  expect(await hlSize(page, "search-active")).toBe(0);
  await expect(link).toBeFocused();
});

test("e2e-search-markup-query-as-text", async ({ page }) => {
  const errors: string[] = [];
  const dialogs: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("dialog", (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  await ready(page);
  const outside = () =>
    page.evaluate(
      () => [...document.body.querySelectorAll("*")].filter((e) => !e.closest("#topbar")).length,
    );
  const before = await page.evaluate(() => document.body.textContent);
  const count = await outside();
  for (const q of ["<img src=x onerror=alert(1)>", ".*", "("]) {
    await type(page, q);
    await page.waitForTimeout(100);
    expect(await outside(), q).toBe(count);
    expect(await page.locator("img[src='x']").count()).toBe(0);
  }
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(box(page)).toHaveValue("");
  expect(await page.evaluate(() => document.body.textContent)).toBe(before);
  expect(dialogs).toEqual([]);
  expect(errors).toEqual([]);
  // The query reaches no URL and no storage.
  expect(new URL(page.url()).search + new URL(page.url()).hash).toBe("");
});

test("e2e-search-scope", async ({ page }) => {
  await page.route(
    (u) => u.pathname === "/",
    async (route) => {
      const res = await route.fetch();
      let body = await res.text();
      body = body
        .replace("</aside>", "<p>zztelem</p></aside>")
        .replace("</nav>", "<p>zznav</p></nav>")
        .replace("</main>", '<p aria-hidden="true">zzaria</p><p class="visually-hidden">zzhidden</p><p>zzvisible</p></main>');
      await route.fulfill({ response: res, body });
    },
  );
  await ready(page);
  const found = async (q: string) => {
    await type(page, q);
    await page.waitForTimeout(80);
    return page.evaluate(() => document.querySelector(".search-count")!.textContent);
  };
  expect(await found("zzvisible")).toBe("1 of 1");
  for (const q of ["zztelem", "zznav", "zzaria", "zzhidden"]) expect(await found(q), q).toBe("0 of 0");
  // Case and diacritics.
  expect(await found("IDEMPOTENCY")).toBe("1 of 1");
  expect(await found("Ingenieurwíssenschaften")).toBe("1 of 1");
  // A phrase that splits across the lang span.
  expect(await found('("luft- und raumfahrt ingenieurwissenschaften"), hochschule')).toBe("1 of 1");
  expect(await hlSize(page, "search-active")).toBeGreaterThanOrEqual(2);
  // A one-character query finds nothing and shows no list.
  await type(page, "a");
  await expect(counter(page)).toHaveText("");
  await expect(page.locator(".search-pop")).toBeHidden();
});

test("e2e-search-scope-hero", async ({ page }) => {
  await ready(page);
  await type(page, "Combines hands-on");
  await expect(counter(page)).toHaveText("1 of 1");
});

test("e2e-search-phone-button", async ({ page }) => {
  await ready(page, 360, 640);
  const toggle = page.locator("#topbar .search-toggle");
  const b = (await toggle.boundingBox())!;
  expect(b.width).toBeGreaterThanOrEqual(44);
  expect(b.height).toBeGreaterThanOrEqual(44);
  await expect(box(page)).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(box(page)).toBeVisible();
  await expect(box(page)).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(await box(page).getAttribute("placeholder")).not.toContain("(press /)");
  const row = (await page.locator(".search").boundingBox())!;
  expect(row.width).toBeGreaterThanOrEqual(359);
  expect(row.height).toBeLessThanOrEqual(56);
  await type(page, "architecture");
  await expect(options(page).first()).toBeVisible();
  const pop = await page.evaluate(() => {
    const p = document.querySelector<HTMLElement>(".search-pop")!;
    const r = p.getBoundingClientRect();
    const cs = getComputedStyle(p);
    return {
      bottom: r.bottom,
      right: r.right,
      vh: window.innerHeight,
      vw: window.innerWidth,
      overflowY: cs.overflowY,
      sw: document.documentElement.scrollWidth,
    };
  });
  expect(pop.bottom).toBeLessThanOrEqual(pop.vh);
  expect(pop.right).toBeLessThanOrEqual(pop.vw);
  expect(pop.overflowY).toBe("auto");
  expect(pop.sw).toBeLessThanOrEqual(pop.vw);
  for (const name of ["Next", "Previous"]) {
    const bb = (await page.getByRole("button", { name }).boundingBox())!;
    expect(bb.width).toBeGreaterThanOrEqual(44);
    expect(bb.height).toBeGreaterThanOrEqual(44);
  }
  // The toggle closes the row and clears the search.
  await toggle.click();
  await expect(box(page)).toBeHidden();
  expect(await hlSize(page, "search-all")).toBe(0);
});

test("e2e-search-combobox-aria", async ({ page }) => {
  await ready(page);
  const i = box(page);
  await expect(i).toHaveAttribute("aria-expanded", "false");
  await expect(i).toHaveAttribute("aria-autocomplete", "list");
  const listId = await i.getAttribute("aria-controls");
  expect(listId).toBeTruthy();
  await expect(page.locator(`#${listId}`)).toHaveAttribute("role", "listbox");
  await type(page, "nodejs");
  await expect(i).toHaveAttribute("aria-expanded", "true");
  await expect(i).not.toHaveAttribute("aria-activedescendant", /.+/);
  await page.keyboard.press("ArrowDown");
  const id = await i.getAttribute("aria-activedescendant");
  expect(id).toBeTruthy();
  await expect(page.locator(`#${id}`)).toHaveAttribute("role", "option");
  await expect(page.locator(`#${id}`)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowDown");
  const id2 = await i.getAttribute("aria-activedescendant");
  expect(id2).not.toBe(id);
  await page.keyboard.press("ArrowUp");
  await expect(i).toHaveAttribute("aria-activedescendant", id!);
  await page.keyboard.press("Escape");
  await expect(i).toHaveAttribute("aria-expanded", "false");
  await expect(i).not.toHaveAttribute("aria-activedescendant", /.+/);
});

test("e2e-search-highlight-contrast", async ({ page }) => {
  for (const scheme of ["dark", "light"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await ready(page);
    await type(page, "architecture");
    const m = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const parse = (s: string) => {
        const c = document.createElement("canvas").getContext("2d")!;
        c.fillStyle = s;
        const v = c.fillStyle as string;
        const hex = v.startsWith("#") ? v : "#000000";
        return [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
      };
      const lum = ([r, g, b]: number[]) => {
        const f = (x: number) => ((x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a: number[], b: number[]) => {
        const x = lum(a);
        const y = lum(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      };
      // Read the ::highlight rules and resolve their custom properties.
      const rules: Record<string, CSSStyleDeclaration> = {};
      const walk = (list: CSSRuleList) => {
        for (const r of list) {
          if (r instanceof CSSStyleRule && r.selectorText.startsWith("::highlight(")) {
            rules[r.selectorText] = r.style;
          } else if ("cssRules" in r) {
            const g = r as CSSGroupingRule;
            if (!(r instanceof CSSMediaRule) || window.matchMedia(r.conditionText).matches) walk(g.cssRules);
          }
        }
      };
      for (const s of document.styleSheets) walk(s.cssRules);
      const resolve = (v: string) => {
        const k = v.match(/var\((--[\w-]+)\)/);
        return k ? root.getPropertyValue(k[1]).trim() : v.trim();
      };
      const out: Record<string, { bg: string; fg: string; ratio: number; deco: string }> = {};
      for (const name of ["search-all", "search-active"]) {
        const st = rules[`::highlight(${name})`];
        const bg = resolve(st.getPropertyValue("background-color"));
        const fg = resolve(st.getPropertyValue("color"));
        out[name] = {
          bg,
          fg,
          ratio: ratio(parse(bg), parse(fg)),
          deco: st.getPropertyValue("text-decoration-line") + " " + st.getPropertyValue("text-decoration-thickness"),
        };
      }
      return out;
    });
    expect(m["search-all"].ratio, scheme).toBeGreaterThanOrEqual(4.5);
    expect(m["search-active"].ratio, scheme).toBeGreaterThanOrEqual(4.5);
    // The active match differs by more than colour: a 3 px underline.
    expect(m["search-active"].deco, scheme).toContain("underline");
    expect(m["search-active"].deco, scheme).toContain("3px");
    expect(m["search-all"].deco, scheme).not.toContain("underline");
    expect(m["search-active"].bg, scheme).not.toBe(m["search-all"].bg);
  }
});

test.describe("no highlights api", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      delete (CSS as unknown as Record<string, unknown>).highlights;
    });
  });

  test("e2e-search-no-highlights-api", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await ready(page);
    expect(await page.evaluate(() => "highlights" in CSS)).toBe(false);
    await type(page, "nodejs");
    await expect(options(page)).toHaveCount(3);
    const n = await expectedCount(page, "nodejs");
    await expect(counter(page)).toHaveText(`1 of ${n}`);
    const y0 = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("Enter");
    await expect(counter(page)).toHaveText(`2 of ${n}`);
    expect(await page.evaluate(() => window.scrollY)).not.toBe(y0);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.locator("#search-list")).toBeHidden();
    expect(await page.evaluate(() => document.activeElement!.tagName)).toMatch(/^H[1-3]$/);
    await page.keyboard.press("Escape");
    expect(errors).toEqual([]);
  });
});

test("e2e-search-one-popover", async ({ page }) => {
  await ready(page, 1024);
  await type(page, "nodejs");
  await expect(options(page)).toHaveCount(3);
  await page.locator("#topbar .contents-btn").click();
  await expect(page.locator("#nav")).toBeVisible();
  await expect(page.locator("#search-list")).toBeHidden();
  // The nav moves focus to its first link after it opens. Wait for that before the next key.
  await expect(page.locator("#nav a:focus")).toHaveCount(1);
  await page.keyboard.press("/");
  await expect(box(page)).toBeFocused();
  await expect(page.locator("#nav")).toBeVisible();
  await type(page, "nodejs");
  await expect(options(page)).toHaveCount(3);
  await expect(page.locator("#nav")).toBeHidden();
  const open = await page.evaluate(
    () => [...document.querySelectorAll("[popover]")].filter((e) => e.matches(":popover-open")).length,
  );
  expect(open).toBe(0);
});

test("e2e-search-keeps-highlights-on-scroll", async ({ page }) => {
  await ready(page);
  await type(page, "architecture");
  await expect(counter(page)).toHaveText(`1 of ${await expectedCount(page, "architecture")}`);
  const n = await hlSize(page, "search-all");
  expect(n).toBeGreaterThan(3);
  const text = await counter(page).textContent();
  for (const y of [400, 1600, 3000, 0]) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(60);
    expect(await hlSize(page, "search-all")).toBe(n);
    expect(await hlSize(page, "search-active")).toBe(1);
    await expect(counter(page)).toHaveText(text!);
  }
});

test("e2e-search-long-name-ellipsis", async ({ page }) => {
  await page.route(
      (u) => u.pathname === "/",
      async (route) => {
        const res = await route.fetch();
        const body = (await res.text()).replace(
          /(<h3 id="[^"]*">)Principal Engineer/,
          "$1Principal" + "Engineer".repeat(30),
        );
        await route.fulfill({ response: res, body });
      },
    );
  for (const w of [360, 1280]) {
    await ready(page, w, 700);
    if (w < 768) await page.locator("#topbar .search-toggle").click();
    await type(page, "principal");
    await expect(options(page).first()).toBeVisible();
    const m = await page.evaluate(() => {
      const pop = document.querySelector<HTMLElement>(".search-pop")!.getBoundingClientRect();
      return {
        sw: document.documentElement.scrollWidth,
        vw: window.innerWidth,
        titles: [...document.querySelectorAll<HTMLElement>(".search-opt-title")].map((t) => {
          const cs = getComputedStyle(t);
          const r = t.getBoundingClientRect();
          return {
            overflow: cs.overflow,
            textOverflow: cs.textOverflow,
            nowrap: cs.whiteSpace,
            inside: r.right <= pop.right + 0.5 && r.left >= pop.left - 0.5,
            clipped: t.scrollWidth > t.clientWidth,
          };
        }),
      };
    });
    expect(m.sw).toBeLessThanOrEqual(m.vw);
    expect(m.titles.some((t) => t.clipped)).toBe(true);
    for (const t of m.titles) {
      expect(t.textOverflow).toBe("ellipsis");
      expect(t.overflow).toBe("hidden");
      expect(t.nowrap).toBe("nowrap");
      expect(t.inside).toBe(true);
    }
  }
});

test("e2e-search-more-row", async ({ page }) => {
  await ready(page);
  await type(page, "er");
  await expect(options(page)).toHaveCount(8);
  await expect(page.locator(".search-pop")).toContainText(/^[\s\S]*and \d+ more/);
});

test("e2e-search-ignores-map-codes", async ({ page }) => {
  await ready(page);
  await type(page, "LROP");
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(page.locator(".search-count")).toContainText(/0|no/i);
  expect(await expectedCount(page, "LROP")).toBe(0);
  await type(page, "EDDW");
  await expect(page.getByRole("option")).toHaveCount(0);
});
