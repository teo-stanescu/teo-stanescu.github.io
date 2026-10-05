import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "../../src/components/App";
import { content } from "../../src/content";
import { todo, type Todo } from "../../src/model";
import { GITHUB_URL } from "../../src/config";

const html = (o: { hasCv: boolean; base?: string; positioning?: string | Todo }) => {
  const c = o.positioning
    ? { ...content, person: { ...content.person, positioning: o.positioning } }
    : content;
  return renderToStaticMarkup(<App content={c} hasCv={o.hasCv} base={o.base ?? "/"} />);
};

it("render-hero-fields", () => {
  const out = html({ hasCv: true });
  expect(out.match(/<h1[ >]/g)).toHaveLength(1);
  expect(out).toContain(`<h1>${content.person.name}</h1>`);
  const hero0 = /<header class="hero"[\s\S]*?<\/header>/.exec(out)![0];
  expect(hero0).toContain(`<p class="hero-title">${content.person.title}</p>`);
  expect(hero0).toContain(`<p class="hero-location">${content.person.location}</p>`);
  expect(hero0).toContain(`<p class="eyebrow">${content.labels.eyebrow}</p>`);
  const at = (needle: string) => hero0.indexOf(needle);
  expect(at("<h1>")).toBeLessThan(at("hero-title"));
  expect(at("hero-title")).toBeLessThan(at("hero-location"));
  expect(out).toMatch(/<a [^>]*href="#main"[^>]*>Skip to content<\/a>/);
  expect(out).toContain(`href="${GITHUB_URL}"`);
  expect(out).toContain('href="mailto:teo.st95@gmail.com"');
  const hero = /<header class="hero"[\s\S]*?<\/header>/.exec(out)![0];
  const hrefs = [...hero.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]);
  expect(hrefs).toEqual(["#main", "/cv.pdf", GITHUB_URL, "mailto:teo.st95@gmail.com"]);
  expect(out).not.toContain("target=");
});

it("render-hero-cv-present", () => {
  expect(html({ hasCv: true })).toMatch(/<a [^>]*href="\/cv\.pdf"[^>]*>Download CV \(PDF\)<\/a>/);
  expect(html({ hasCv: true, base: "/x/" })).toMatch(
    /<a [^>]*href="\/x\/cv\.pdf"[^>]*>Download CV \(PDF\)<\/a>/,
  );
});

it("render-hero-cv-absent", () => {
  const out = html({ hasCv: false });
  expect(out).not.toContain("cv.pdf");
  expect(out).not.toContain("Download CV (PDF)");
  expect(out).toContain(GITHUB_URL);
});

it("render-hero-omits-todo-line", () => {
  const without = html({ hasCv: false, positioning: todo("x") });
  expect(without).not.toMatch(/<p[^>]*><\/p>/);
  expect(without).not.toContain("hero-line");
  const line = "One positioning sentence.";
  const withLine = html({ hasCv: false, positioning: line });
  expect(withLine).toMatch(
    new RegExp(`${content.person.location}</p><p class="hero-line">${line}</p>`),
  );
});

it("render-hero-summary", () => {
  const out = html({ hasCv: true, positioning: "One positioning sentence." });
  const esc = content.person.summary.replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
  expect(out).toContain(`<p class="hero-summary">${esc}</p><div class="hero-actions">`);
  expect(out.indexOf("hero-line")).toBeLessThan(out.indexOf("hero-summary"));
  const noLine = html({ hasCv: false, positioning: todo("x") });
  expect(noLine).toMatch(new RegExp(`${content.person.location}</p><p class="hero-summary">`));
});
