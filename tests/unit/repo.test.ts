import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(p, "utf8");

describe("repo scaffold", () => {
  it("repo-gitignore-entries", () => {
    const lines = read(".gitignore")
      .split("\n")
      .map((l) => l.trim());
    for (const entry of [
      ".private/",
      ".private",
      ".worktrees/",
      "docs/guild/",
      ".claude/",
      "node_modules/",
      "dist/",
    ]) {
      expect(lines).toContain(entry);
    }
  });

  it("repo-no-banned-packages", () => {
    const pkg = JSON.parse(read("package.json"));
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    const banned =
      /three|gsap|framer|motion|analytics|gtag|segment|mixpanel|plausible|fontsource|lighthouse|sharp|jimp/i;
    expect(names.filter((n) => banned.test(n))).toEqual([]);
  });

  it("repo-vite-base-root", () => {
    expect(read("vite.config.ts")).toContain('base: "/"');
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (["node_modules", "dist", ".git", ".private", "docs", ".worktrees"].includes(name)) continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx|js|json|html)$/.test(name) && /\bbase\s*:/.test(read(p))) {
          if (p !== "vite.config.ts" && !p.startsWith("tests")) hits.push(p);
        }
      }
    };
    walk(".");
    expect(hits).toEqual([]);
  });
});
