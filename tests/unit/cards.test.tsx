import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "../../src/components/App";
import { RoleCard } from "../../src/components/RoleCard";
import { content } from "../../src/content";
import { todo, type Role } from "../../src/model";

const pageHtml = () => renderToStaticMarkup(<App content={content} hasCv={false} base="/" />);
const cardHtml = (role: Role, stageName = "1 - Test") =>
  renderToStaticMarkup(<RoleCard role={role} stageName={stageName} labels={content.labels} />);
const tags = (html: string, re: string) =>
  [...html.matchAll(new RegExp(`<(${re})(?: [^>]*)?>([\\s\\S]*?)</\\1>`, "g"))].map((m) => ({
    tag: m[1]!,
    text: m[2]!.replace(/<[^>]*>/g, ""),
  }));
const attr = (html: string, name: string) =>
  new RegExp(`<article [^>]*?${name}="([^"]*)"`).exec(html)?.[1];
const base: Role = {
  id: "x",
  title: "Title",
  org: "Org",
  dates: { start: { year: 2020, month: 1 }, end: "present" },
  focus: "Focus",
  context: "c1",
  decision: "d1",
  outcome: "o1",
  details: ["b1", "b2"],
};

it("render-stage-order", () => {
  const out = pageHtml();
  const h2 = tags(out, "h2").map((h) => h.text).filter((t) => t.startsWith("Stage"));
  expect(h2).toEqual(content.stages.map((s) => s.heading));
  expect(h2.map((t) => t.slice(0, 7))).toEqual(["Stage 0", "Stage 1", "Stage 2", "Stage 3"]);
  for (const s of content.stages) expect(out).toContain(`<section class="stage" id="stage-${s.id}">`);
});

it("render-stage-membership", () => {
  const parts = pageHtml()
    .split('<section class="stage" id="stage-')
    .slice(1)
    .map((p) => p.split("</section>")[0]!);
  expect(parts).toHaveLength(content.stages.length);
  content.stages.forEach((s, i) => {
    expect(parts[i]!.startsWith(`${s.id}"`)).toBe(true);
    expect(tags(parts[i]!, "h3").map((h) => h.text)).toEqual(s.roles.map((r) => r.title));
  });
});

it("render-card-part-order", () => {
  const out = cardHtml(base);
  expect(tags(out, "h4").map((h) => h.text)).toEqual(["Context", "Decision", "Outcome"]);
  expect(out).toMatch(
    /<h4[^>]*>Context<\/h4><p[^>]*>c1<\/p><\/div><div[^>]*><h4[^>]*>Decision<\/h4><p[^>]*>d1<\/p><\/div><div[^>]*><h4[^>]*>Outcome<\/h4><p[^>]*>o1<\/p>/,
  );
});

it("render-omits-todo-parts", () => {
  const out = cardHtml({ ...base, decision: todo("n") });
  expect(tags(out, "h4").map((h) => h.text)).toEqual(["Context", "Outcome"]);
  expect(out).not.toContain("d1");
  const none = cardHtml({
    ...base,
    context: todo("a"),
    decision: todo("b"),
    outcome: todo("c"),
    details: [todo("d")],
  });
  expect(none).not.toContain("<h4");
  expect(none).not.toContain("<details");
  expect(none).not.toContain("<summary");
  const some = cardHtml({ ...base, details: [todo("d"), "kept"] });
  expect(tags(some, "li").map((l) => l.text)).toEqual(["kept"]);
  const noOrg = cardHtml({ ...base, org: todo("o") });
  expect(noOrg).not.toContain("card-org");
});

it("render-heading-levels", () => {
  let prev = 0;
  for (const h of tags(pageHtml(), "h[1-6]")) {
    const lvl = Number(h.tag[1]);
    expect(lvl - prev).toBeLessThanOrEqual(1);
    prev = lvl;
  }
});

it("render-card-data-attrs", () => {
  const out = pageHtml();
  const cards = out.match(/<article [^>]*>/g)!;
  expect(cards.length).toBe(content.stages.flatMap((s) => s.roles).length);
  for (const c of cards) {
    expect(c).toContain('class="card"');
    for (const a of ["id", "data-stage", "data-role", "data-years", "data-team", "data-focus"]) {
      expect(c, a).toMatch(new RegExp(` ${a}="`));
    }
  }
  const a = cardHtml({ ...base, teamSize: 6 });
  expect(attr(a, "id")).toBe("x");
  expect(attr(a, "data-stage")).toBe("1 - Test");
  expect(attr(a, "data-role")).toBe("Title");
  expect(attr(a, "data-years")).toBe("Jan 2020 – Present");
  expect(attr(a, "data-team")).toBe("6");
  expect(attr(a, "data-focus")).toBe("Focus");
  const b = cardHtml({ ...base, focus: todo("f") });
  expect(attr(b, "data-team")).toBe("");
  expect(attr(b, "data-focus")).toBe("");
});

it("render-hyperpanda-date", () => {
  const out = pageHtml();
  const m = /<article [^>]*id="hyperpanda"[\s\S]*?<\/article>/.exec(out)!;
  expect(/<p class="card-dates">([^<]*)<\/p>/.exec(m[0])?.[1]).toBe("Oct 2017");
});

it("render-summary-names-role", () => {
  const out = cardHtml(base);
  expect(out).toMatch(
    /<summary>Details<span class="visually-hidden"> — Title<\/span><\/summary>/,
  );
  const names = [...pageHtml().matchAll(/<summary>([\s\S]*?)<\/summary>/g)].map((m) =>
    m[1]!.replace(/<[^>]*>/g, ""),
  );
  expect(names.length).toBeGreaterThan(0);
  expect(new Set(names).size).toBe(names.length);
});

it("render-stage-label-after-heading", () => {
  const s = content.stages[0]!;
  expect(pageHtml()).toContain(
    `<h2>${s.heading}</h2><p class="stage-label">${s.label}</p>`,
  );
});

it("render-card-meta", () => {
  const withBoth = cardHtml({ ...base, teamSize: 6 });
  expect(withBoth).toContain(
    `<dl class="card-meta"><div><dt>${content.labels.tTeam}</dt><dd>6</dd></div><div><dt>${content.labels.tFocus}</dt><dd>Focus</dd></div></dl>`,
  );
  const none = cardHtml({ ...base, focus: todo("x") });
  expect(none).not.toContain("card-meta");
});
