import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "../../src/components/App";
import { content } from "../../src/content";
import { orderedStages } from "../../src/model";

const page = () => renderToStaticMarkup(<App content={content} hasCv={false} base="/" />);
const navHtml = () => /<nav [\s\S]*?<\/nav>/.exec(page())![0];
const links = (html: string) =>
  [...html.matchAll(/<a href="([^"]*)">([^<]*)<\/a>/g)].map((m) => ({ href: m[1]!, text: m[2]! }));
const ids = (html: string) => [...html.matchAll(/ id="([^"]*)"/g)].map((m) => m[1]!);

it("render-dom-order-skip-topbar-nav-main", () => {
  const out = page();
  const at = (s: string) => out.indexOf(s);
  const order = ['class="skip-link"', 'id="topbar"', "<nav ", '<header class="hero"', "<main ", "<footer "];
  const pos = order.map(at);
  for (const p of pos) expect(p).toBeGreaterThan(-1);
  expect([...pos].sort((a, b) => a - b)).toEqual(pos);
});

it("render-skip-link-targets-main", () => {
  const out = page();
  expect(out).toMatch(/<a class="skip-link" href="#main">Skip to content<\/a>/);
  expect(out.match(/class="skip-link"/g)).toHaveLength(1);
  expect(out).toContain('<main id="main"');
});

it("render-hero-id-top", () => {
  expect(page()).toContain('<header class="hero" id="top">');
});

it("render-topbar-slot-labels", () => {
  const out = page();
  const slot = /<div id="topbar"[^>]*>/.exec(out)![0];
  const l = content.labels;
  const want: Record<string, string> = {
    "data-search": l.search,
    "data-contents": l.contents,
    "data-placeholder": l.placeholder,
    "data-placeholder-touch": l.placeholderTouch,
    "data-no-matches": l.noMatches,
    "data-of": l.of,
    "data-next": l.next,
    "data-previous": l.previous,
    "data-results": l.results,
  };
  for (const [k, v] of Object.entries(want)) {
    expect(v.length, k).toBeGreaterThan(0);
    expect(slot, k).toContain(` ${k}="${v}"`);
  }
  expect(out).toMatch(/<div id="topbar" class="topbar"[^>]*><\/div>/);
});

it("render-nav-entries-order", () => {
  const ss = orderedStages(content);
  const entries = [
    ["#top", content.labels.navTop],
    ...ss.map((s) => [`#stage-${s.id}`, s.heading]),
    ["#skills", "Skills"],
    ["#contact", "Contact"],
  ];
  expect(entries.map((e) => e[1])).toEqual([
    "Top",
    "Stage 3 - Orbit",
    "Stage 2 - Ascent",
    "Stage 1 - Test flights",
    "Stage 0 - Pre-launch",
    "Skills",
    "Contact",
  ]);
  const got = links(navHtml()).filter((l) => entries.some((e) => e[0] === l.href));
  expect(got.map((g) => [g.href, g.text])).toEqual(entries);
});

it("render-nav-single-list", () => {
  const out = page();
  expect(out.match(/<nav[ >]/g)).toHaveLength(1);
  const nav = navHtml();
  // One top-level list. All other lists nest inside a stage entry.
  expect(nav).toMatch(/^<nav [^>]*><ul><li>/);
  expect(nav).toMatch(/<\/ul><\/nav>$/);
  expect(nav).toContain('id="nav"');
  expect(nav).toContain(`aria-label="${content.labels.contents}"`);
});

it("render-nav-targets-exist", () => {
  const out = page();
  const have = new Set(ids(out));
  const hrefs = links(navHtml());
  expect(hrefs.length).toBe(7 + content.stages.flatMap((s) => s.roles).length);
  for (const l of hrefs) {
    expect(l.href.startsWith("#"), l.href).toBe(true);
    expect(have.has(l.href.slice(1)), l.href).toBe(true);
  }
});

it("render-nav-nested-roles", () => {
  const nav = navHtml();
  for (const s of orderedStages(content)) {
    const li = new RegExp(`<li><a href="#stage-${s.id}">[^<]*</a><ul>([\\s\\S]*?)</ul></li>`).exec(nav);
    expect(li, `stage ${s.id}`).not.toBeNull();
    const got = links(li![1]!);
    expect(got).toEqual(s.roles.map((r) => ({ href: `#${r.id}-heading`, text: r.title })));
  }
  // Each role link targets the heading of its card.
  const out = page();
  for (const r of content.stages.flatMap((s) => s.roles)) {
    expect(out).toContain(`<h3 id="${r.id}-heading">${r.title}</h3>`);
  }
});

it("render-nav-order-matches-headings", () => {
  const out = page();
  const body = out.slice(out.indexOf('<header class="hero"'));
  const headings = [...body.matchAll(/<(h1|h2|h3)( id="([^"]*)")?[^>]*>([^<]*)<\/\1>/g)];
  // Page order of the nav targets: hero, stage h2, role h3, skills h2, contact h2.
  const pageOrder: string[] = ["top"];
  for (const h of headings) {
    if (h[1] === "h2" && h[4]!.startsWith("Stage")) pageOrder.push(h[4]!);
    else if (h[1] === "h3" && h[3]) pageOrder.push(h[4]!);
    else if (h[1] === "h2") pageOrder.push(h[4]!);
  }
  const navOrder = links(navHtml()).map((l) => l.text);
  expect(navOrder.length).toBe(pageOrder.length);
  // Map text of the nav entries to page headings: Top, Skills and Contact have fixed labels.
  const expected = pageOrder.map((t) =>
    t === "top" ? content.labels.navTop : t === content.labels.skills ? content.labels.navSkills : t,
  );
  expect(navOrder).toEqual(expected);
});
