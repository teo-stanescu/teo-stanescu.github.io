import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("dist og card", () => {
  it("dist-og-image-absolute", () => {
    expect(existsSync("dist/og-card.png")).toBe(true);
    const html = readFileSync("dist/index.html", "utf8");
    expect(html).toMatch(/<meta property="og:image" content="https:\/\/teo-stanescu\.github\.io\/og-card\.png"/);
  });
});
