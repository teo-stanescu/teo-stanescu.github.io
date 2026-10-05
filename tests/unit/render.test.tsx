import { it, expect } from "vitest";
import { render } from "../../src/entry-server";
import { content } from "../../src/content";
import { SITE_URL, GITHUB_URL } from "../../src/config";

const opts = { hasCv: false, base: "/" };

it("render-content-change", () => {
  const oldText = content.person.summary;
  const newText = "A brand new summary sentence for the test.";
  const changed = { ...content, person: { ...content.person, summary: newText } };
  const out = render({ ...opts, content: changed });
  const all = out.head + out.html;
  expect(all).toContain(newText);
  expect(all).not.toContain(oldText);
});

it("render-head-tags", () => {
  const { head } = render(opts);
  expect(head).toContain(`<title>${content.seo.title}</title>`);
  const desc = /<meta name="description" content="([^"]*)"/.exec(head);
  expect(desc).not.toBeNull();
  expect(desc![1]!.length).toBeLessThanOrEqual(160);
  expect(head).toContain(`<link rel="canonical" href="${SITE_URL}"`);
  expect(head).toContain('<meta property="og:title"');
  expect(head).toContain('<meta property="og:description"');
  expect(head).toContain(`<meta property="og:url" content="${SITE_URL}"`);
  expect(head).toContain('<meta property="og:type"');
  expect(head).toContain(`<meta property="og:image" content="${SITE_URL}og-card.png"`);
  expect(head).toContain('<meta name="twitter:card" content="summary_large_image"');
  expect(head).toContain('<link rel="icon" href="data:,"');
});

it("render-jsonld-person", () => {
  // The field check below is the schema.org proof for AC-27 (QA-18).
  const { head } = render(opts);
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(head);
  expect(m).not.toBeNull();
  const data = JSON.parse(m![1]!);
  expect(data["@context"]).toBe("https://schema.org");
  expect(data["@type"]).toBe("Person");
  expect(data.name).toBe(content.person.name);
  expect(data.jobTitle).toBe(content.person.title);
  expect(data.url).toBe(SITE_URL);
  expect(data.sameAs).toEqual([GITHUB_URL]);
  expect(m![1]).not.toContain(content.person.email);
  expect(m![1]).not.toContain("mailto");
});
