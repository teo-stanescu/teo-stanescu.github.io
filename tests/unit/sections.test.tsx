import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "../../src/components/App";
import { Telemetry } from "../../src/components/Telemetry";
import { content } from "../../src/content";
import { GITHUB_URL } from "../../src/config";
import { todo, present, currentRole, type Content } from "../../src/model";

const page = (c: Content = content) => renderToStaticMarkup(<App content={c} hasCv={false} base="/" />);
const tags = (html: string, re: string) =>
  [...html.matchAll(new RegExp(`<(${re})(?: [^>]*)?>([\\s\\S]*?)</\\1>`, "g"))].map((m) => ({
    tag: m[1]!,
    text: m[2]!.replace(/<[^>]*>/g, ""),
  }));
const aside = (html: string) => /<aside class="telemetry"[\s\S]*?<\/aside>/.exec(html)![0];
const dd = (html: string, k: string) =>
  new RegExp(`<dd[^>]*data-t="${k}"[^>]*>([\\s\\S]*?)</dd>`).exec(html)?.[1];
const skillsHtml = (html: string) => /<section class="skills"[\s\S]*?<\/section>/.exec(html)![0];

it("render-telemetry-idle-current", () => {
  const out = page();
  expect(out).toContain('<aside class="telemetry" aria-label="Mission telemetry"');
  const a = out.indexOf('<aside class="telemetry"');
  expect(out.indexOf('<header class="hero"')).toBeLessThan(a);
  expect(a).toBeLessThan(out.indexOf('<main id="main"'));
  const t = aside(out);
  expect(/data-t="state"[^>]*>([^<]*)</.exec(t)![1]).toBe("Current");
  expect(dd(t, "stage")).toBe("3 - Orbit");
  expect(dd(t, "role")).toBe("Principal Engineer");
  expect(dd(t, "years")).toMatch(/Present$/);
  expect(dd(t, "team")).toBe("up to 12");
  expect(dd(t, "focus")).toBe(currentRole(content).role.focus);
  expect(t).not.toContain("aria-live");
  expect(t).not.toMatch(/<(a|button|input|select|textarea)\b|tabindex/);
});

it("render-telemetry-idle-current-any-stage", () => {
  const c: Content = { ...content, stages: [...content.stages].reverse() };
  const t = aside(page(c));
  expect(dd(t, "stage")).toBe("3 - Orbit");
  expect(dd(t, "role")).toBe("Principal Engineer");
  expect(/data-t="state"[^>]*>([^<]*)</.exec(t)![1]).toBe("Current");
});

it("render-telemetry-dash", () => {
  const { stage, role } = currentRole(content);
  const c: Content = {
    ...content,
    stages: content.stages.map((s) =>
      s !== stage
        ? s
        : { ...s, roles: s.roles.map((r) => (r !== role ? r : { ...r, teamSize: undefined, focus: todo("x") })) },
    ),
  };
  const t = aside(page(c));
  const dash = '<span aria-hidden="true">—</span><span class="visually-hidden">not stated</span>';
  expect(dd(t, "team")).toBe(dash);
  expect(dd(t, "focus")).toBe(dash);
  expect(t).toContain('data-idle="Current"');
  expect(t).toContain('data-active="In view"');
  expect(t).toContain('data-dash="not stated"');
  expect(t).toContain(`data-glyph="${content.labels.dash}"`);
  expect(t).toContain(`<span aria-hidden="true">${content.labels.dash}</span>`);
  expect(renderToStaticMarkup(<Telemetry content={content} />)).toBe(aside(page()));
});

it("render-skills-groups", () => {
  const s = skillsHtml(page());
  expect(tags(s, "h2").map((h) => h.text)).toEqual(["Skills and languages"]);
  expect(tags(s, "h3").map((h) => h.text)).toEqual([
    "Architecture and strategy",
    "Leadership",
    "Platform and engineering",
    "Also",
    "Languages",
  ]);
  const uls = s.split("<ul").slice(1).map((u) => u.split("</ul>")[0]!);
  content.skills.forEach((g, i) => {
    expect(tags(uls[i]!, "li").map((l) => l.text)).toEqual(g.items.filter(present));
  });
});

it("render-languages-no-level", () => {
  const s = skillsHtml(page());
  const last = s.split("<ul").pop()!.split("</ul>")[0]!;
  expect(tags(last, "li").map((l) => l.text)).toEqual(["English", "German"]);
});

it("render-footer-links", () => {
  const f = /<footer[\s\S]*?<\/footer>/.exec(page())![0];
  expect(tags(f, "h2").map((h) => h.text)).toEqual(["Contact"]);
  const links = [...f.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map((m) => [m[1], m[2]]);
  expect(links).toEqual([
    [GITHUB_URL, GITHUB_URL.replace("https://", "")],
    ["mailto:teo.st95@gmail.com", "teo.st95@gmail.com"],
  ]);
});

it("render-no-blank-target", () => {
  expect(page()).not.toMatch(/target=/);
});

it("render-no-theme-toggle", () => {
  expect(page()).not.toMatch(/<(button|input)[\s>]/);
});
