import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "../../src/components/App";
import { content } from "../../src/content";

const out = renderToStaticMarkup(<App content={content} hasCv={false} base="/" />);
const maps = out.match(/<svg[^>]*class="atc-map"[\s\S]*?<\/svg>/g) ?? [];
const map = maps[0] ?? "";

describe("motifs", () => {
  it("render-map-single-svg-aria-hidden", () => {
    expect(maps).toHaveLength(1);
    expect(map).toMatch(/^<svg[^>]*aria-hidden="true"/);
    expect(map).toMatch(/focusable="false"/);
    expect(map.match(/<symbol[ >]/g)).toHaveLength(1);
    expect(map).toContain('<symbol id="plane"');
  });

  it("render-map-no-focusable", () => {
    expect(map).not.toMatch(/tabindex/i);
    expect(map).not.toMatch(/<(a|button|input|select|textarea)[ >]/);
  });

  const labels = [...map.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]!);

  it("render-map-codes-only-lrop-eddw", () => {
    expect(labels.length).toBeGreaterThan(8);
    const four = labels.filter((l) => /^[A-Z]{4}$/.test(l));
    expect(four.sort()).toEqual(["EDDW", "LROP"]);
    expect(labels).toContain("LROP");
    expect(labels).toContain("EDDW");
  });

  it("render-map-waypoints-five-letters", () => {
    const rest = labels.filter((l) => l !== "LROP" && l !== "EDDW");
    expect(rest.length).toBeGreaterThanOrEqual(8);
    for (const l of rest) expect(l).toMatch(/^[A-Z]{5}$/);
  });

  it("render-plane-icons-six", () => {
    const uses = out.match(/<use[^>]*href="#plane"[^>]*>/g) ?? [];
    expect(uses).toHaveLength(6);
    const icons = out.match(/<svg[^>]*class="plane[^"]*"[^>]*>/g) ?? [];
    expect(icons).toHaveLength(6);
    for (const i of icons) expect(i).toContain('aria-hidden="true"');
  });

  it("render-plane-none-in-ui", () => {
    for (const re of [/<nav[\s\S]*?<\/nav>/g, /<div[^>]*class="telemetry"[\s\S]*?<\/div>/g, /<[^>]*id="topbar"[\s\S]*?<\/div>/g]) {
      for (const block of out.match(re) ?? []) expect(block).not.toContain("#plane");
    }
    expect(/<aside[^>]*telemetry[\s\S]*?<\/aside>/.exec(out)?.[0] ?? "").not.toContain("#plane");
    // Four at stage labels, one in the hero, one at the trajectory tip.
    expect(/<section class="stage"[\s\S]*?<\/p>/.exec(out)![0]).toContain("#plane");
    expect(/<header class="hero"[\s\S]*?<\/header>/.exec(out)![0]).toContain("#plane");
    expect(/<div class="tip-plane"[\s\S]*?<\/div>/.exec(out)![0]).toContain("#plane");
  });
});
