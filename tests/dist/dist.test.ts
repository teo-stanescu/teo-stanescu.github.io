import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { gzipSync } from "node:zlib";
import { content } from "../../src/content";
import { orderedStages } from "../../src/model";
import * as cp from "../../scripts/check-private.mjs";

const DIST = "dist";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = () => walk(DIST);
const html = readFileSync(join(DIST, "index.html"), "utf8");

function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function bodyText(): string {
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)![1]!;
  const stripped = body
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ");
  return decode(stripped).replace(/\s+/g, " ");
}

// "id" is a slug, "dates" holds data values (the page shows formatted dates).
const NOT_TEXT = new Set(["id", "dates", "lang"]);

function collect(v: unknown, out: string[]): void {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collect(x, out));
  else if (v && typeof v === "object" && !("todo" in v)) {
    for (const [k, x] of Object.entries(v)) if (!NOT_TEXT.has(k)) collect(x, out);
  }
}

describe("dist", () => {
  it("dist-all-content-in-html", () => {
    const { seo: _seo, ...rest } = content;
    // The CV label shows only when public/cv.pdf exists (dist-cv-link-matches-file).
    // "telemetry" is an aria-label. "inView" and "notStated" are written by script only.
    // The search and contents labels sit in data-* attributes on the topbar slot. Script uses them.
    const {
      cv: cvLabel,
      telemetry: _t,
      inView: _i,
      notStated: _n,
      search: _s1,
      contents: _s2,
      placeholder: _s3,
      placeholderTouch: _s4,
      noMatches: _s5,
      of: _s6,
      next: _s7,
      previous: _s8,
      results: _s9,
      more: _s10,
      ...labels
    } = rest.labels;
    const strings: string[] = [];
    collect({ ...rest, labels }, strings);
    if (existsSync("public/cv.pdf")) strings.push(cvLabel);
    expect(strings.length).toBeGreaterThan(20);
    // Only visible text counts. Attribute values do not.
    const text = bodyText();
    const missing = strings
      .filter((s) => s.trim() !== "")
      .filter((s) => !text.includes(s.replace(/\s+/g, " ").trim()));
    expect(missing).toEqual([]);
  });

  it("dist-card-meta-visible", () => {
    const cards = [...html.matchAll(/<article class="card"[\s\S]*?<\/article>/g)].map((m) => m[0]);
    const roles = orderedStages(content).flatMap((st) => st.roles);
    expect(cards.length).toBe(roles.length);
    roles.forEach((r, i) => {
      const text = decode(cards[i]!.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
      if (r.teamSize) {
        const n = r.teamSizeUpTo ? `${content.labels.upTo} ${r.teamSize}` : `${r.teamSize}`;
        expect(text).toContain(`${content.labels.tTeam} ${n}`);
      }
      if (typeof r.focus === "string") expect(text).toContain(`${content.labels.tFocus} ${r.focus}`);
    });
  });

  it("dist-js-class-before-paint", () => {
    const head = /<head>\s*([\s\S]*?)<\/head>/.exec(html)![1]!;
    expect(head.startsWith("<script>")).toBe(true);
    expect(/^<script>([^<]*)<\/script>/.exec(head)![1]).toContain('classList.add("js")');
  });

  it("dist-nojs-no-controls", () => {
    const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)![1]!.replace(/<script[\s\S]*?<\/script>/g, "");
    expect(body).not.toMatch(/<input[\s>]/);
    expect(body).not.toMatch(/<button[\s>]/);
    const text = decode(body.replace(/<[^>]+>/g, " "));
    expect(text).not.toContain(content.labels.contents);
    expect(text).not.toContain(content.labels.placeholder);
    expect(text).not.toContain(content.labels.placeholderTouch);
    expect(text).not.toContain(content.labels.noMatches);
    expect(body).toContain('id="topbar"');
  });

  it("dist-no-todo", () => {
    const bad = files()
      .filter((f) => [".html", ".css", ".js"].includes(extname(f)))
      .filter((f) => /todo/i.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });

  it("dist-head-tags", () => {
    expect(html).toContain("<title>");
    expect(html).toMatch(/<meta name="description" content="[^"]{1,160}"/);
    expect(html).toContain('<link rel="canonical" href="https://teo-stanescu.github.io/"');
    for (const t of ["og:title", "og:description", "og:url", "og:type", "og:image"]) {
      expect(html).toContain(`<meta property="${t}"`);
    }
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"');
    expect(html).toContain('<link rel="icon" href="data:,"');
    const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
    expect(m).not.toBeNull();
    expect(JSON.parse(m![1]!)["@type"]).toBe("Person");
  });

  it("dist-h2-order-newest-first", () => {
    const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => decode(m[1]!.replace(/<[^>]*>/g, "")));
    expect(h2.slice(0, 4).map((t) => t.slice(0, 7))).toEqual(["Stage 3", "Stage 2", "Stage 1", "Stage 0"]);
    expect(h2[4]).toBe("Skills and languages");
  });

  it("dist-meta-description-length", () => {
    const m = /<meta name="description" content="([^"]*)"/.exec(html);
    expect(m).not.toBeNull();
    expect(m![1]!.length).toBeGreaterThan(0);
    expect(m![1]!.length).toBeLessThanOrEqual(160);
  });

  it("dist-heading-levels", () => {
    const hs = [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)];
    expect(hs.length).toBeGreaterThan(0);
    let prev = 0;
    for (const h of hs) {
      const level = Number(h[1]);
      expect(level - prev).toBeLessThanOrEqual(1);
      expect(h[2]!.replace(/<[^>]+>/g, "").trim()).not.toBe("");
      prev = level;
    }
  });

  it("dist-budgets", () => {
    const gz = (ext: string) =>
      files()
        .filter((f) => extname(f) === ext)
        .reduce((n, f) => n + gzipSync(readFileSync(f)).length, 0);
    expect(gz(".js")).toBeLessThanOrEqual(20480);
    expect(gz(".css")).toBeLessThanOrEqual(30720);
    const fonts = files()
      .filter((f) => [".woff", ".woff2", ".ttf", ".otf"].includes(extname(f)))
      .reduce((n, f) => n + statSync(f).size, 0);
    expect(fonts).toBeLessThanOrEqual(102400);
  });

  it("dist-no-external-url", () => {
    const allowed = [
      "https://teo-stanescu.github.io/",
      "https://github.com/teo-stanescu",
      "https://schema.org",
    ];
    const bad: string[] = [];
    for (const f of files().filter((f) => [".html", ".css", ".js"].includes(extname(f)))) {
      for (const u of readFileSync(f, "utf8").match(/https?:\/\/[^\s"'<>)\\]+/g) ?? []) {
        if (!allowed.some((a) => u.startsWith(a))) bad.push(`${f}: ${u}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("dist-no-sourcemap", () => {
    expect(files().filter((f) => f.endsWith(".map"))).toEqual([]);
    const bad = files()
      .filter((f) => [".html", ".css", ".js"].includes(extname(f)))
      .filter((f) => readFileSync(f, "utf8").includes("sourceMappingURL"));
    expect(bad).toEqual([]);
  });

  it("dist-no-phone-pattern", () => {
    const textExt = [".html", ".css", ".js", ".txt", ".json", ".svg", ".xml"];
    const bad = files()
      .filter((f) => textExt.includes(extname(f)))
      .filter((f) => cp.scanText(readFileSync(f, "utf8"), []).some((h: { kind: string }) => h.kind === "phone"));
    expect(bad).toEqual([]);
  });

  it("dist-cv-link-matches-file", () => {
    expect(html.includes('href="/cv.pdf"')).toBe(existsSync("public/cv.pdf"));
  });
});
