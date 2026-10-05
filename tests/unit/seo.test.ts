import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("seo files", () => {
  it("repo-robots-sitemap", () => {
    const robots = readFileSync("public/robots.txt", "utf8");
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /\n");
    expect(robots).toContain("Sitemap: https://teo-stanescu.github.io/sitemap.xml");
    const sitemap = readFileSync("public/sitemap.xml", "utf8");
    expect(sitemap.match(/<loc>[^<]*<\/loc>/g)).toEqual(["<loc>https://teo-stanescu.github.io/</loc>"]);
  });

  it("repo-og-card-size", () => {
    expect(existsSync("public/og-card.png")).toBe(true);
    const png = readFileSync("public/og-card.png");
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});
