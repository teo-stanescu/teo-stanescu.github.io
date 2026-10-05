import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ESLint } from "eslint";

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
      "actions-runner/",
      "docs/guild/",
      ".claude/",
      "/node_modules",
      "/dist",
    ]) {
      expect(lines).toContain(entry);
    }
    // Anchored at the root, so tests/dist is not ignored. No trailing slash, so symlinks match.
    for (const entry of ["node_modules/", "dist/", "node_modules", "dist"]) {
      expect(lines).not.toContain(entry);
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

  it("repo-no-new-dependency", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.dependencies).toBeUndefined();
    // The v1.0.0 list.
    expect(Object.keys(pkg.devDependencies).sort()).toEqual(
      [
        "@axe-core/playwright",
        "@playwright/test",
        "@types/node",
        "@types/react",
        "@types/react-dom",
        "eslint",
        "react",
        "react-dom",
        "typescript",
        "typescript-eslint",
        "vite",
        "vitest",
      ].sort(),
    );
  });

  it("repo-vite-base-root", () => {
    expect(read("vite.config.ts")).toContain('base: "/"');
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (["node_modules", "dist", ".git", ".private", "docs", ".worktrees", "actions-runner"].includes(name)) continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx|js|json|html)$/.test(name) && /\bbase\s*:\s*["'`]/.test(read(p))) {
          if (p !== "vite.config.ts" && !p.startsWith("tests")) hits.push(p);
        }
      }
    };
    walk(".");
    expect(hits).toEqual([]);
  });
});

describe("repo ci", () => {
  const wf = () => read(".github/workflows/deploy.yml");

  it("repo-workflow-pages-shape", () => {
    const w = wf();
    expect(w).toMatch(/^on:/m);
    expect(w).toMatch(/push:\s*\n\s+branches:\s*\[\s*main\s*\]/);
    expect(w).toContain("workflow_dispatch");
    expect(w).toMatch(/contents:\s*read/);
    expect(w).toMatch(/pages:\s*write/);
    expect(w).toMatch(/id-token:\s*write/);
    expect(w).toMatch(/group:\s*pages/);
    expect(w).toMatch(/cancel-in-progress:\s*false/);
    expect(w).toContain("npm ci");
    expect(w).toContain("npm run verify:ci");
    expect(w).toContain("node scripts/check-commits.mjs --range");
    expect(w).toContain("actions/upload-pages-artifact");
    expect(w).toMatch(/path:\s*dist/);
    expect(w).toContain("actions/deploy-pages");
    expect(w).toContain("fetch-depth: 0");
    expect(w).toMatch(/needs:\s*build/);
    expect(w).toContain("id: deployment");
    expect(w).not.toContain("secrets.");
    expect(w).not.toContain("pull_request_target");
  });

  it("repo-verify-ci-composition", () => {
    const s = JSON.parse(read("package.json")).scripts;
    for (const part of ["npm run lint", "npm run typecheck", "npm test", "npm run build"]) {
      expect(s["verify:ci"]).toContain(part);
    }
    expect(s.lint).toContain("eslint");
    expect(s.typecheck).toContain("tsc");
    expect(s.build).toContain("vite build");
  });
});

describe("repo workflow runner", () => {
  it("repo-workflow-self-hosted", () => {
    const wf = read(".github/workflows/deploy.yml");
    const runsOn = [...wf.matchAll(/runs-on:\s*(\S+)/g)].map((m) => m[1]);
    expect(runsOn).toEqual(["self-hosted", "self-hosted"]);
  });
});

describe("repo eslint", () => {
  it("eslint-ignores-worktrees-and-dist", async () => {
    const eslint = new ESLint();
    for (const p of [".worktrees/x/a.ts", ".worktrees/x/dist/m.js", "dist/a.js", "a/dist/m.js", "playwright-report/a.js", "actions-runner/externals/node20/lib/a.js"]) {
      expect(await eslint.isPathIgnored(join(process.cwd(), p)), p).toBe(true);
    }
  });

  it("eslint-client-blocks-content-imports", async () => {
    const eslint = new ESLint();
    const file = join(process.cwd(), "src/client/a.ts");
    for (const src of [
      'import "../content";',
      'import "../content.js";',
      'import "../content.ts";',
      'void import("../content");',
    ]) {
      const [r] = await eslint.lintText(src + "\n", { filePath: file });
      expect(r.errorCount, src).toBeGreaterThan(0);
    }
    const [ok] = await eslint.lintText('import "../other";\n', { filePath: file });
    expect(ok.errorCount).toBe(0);
  });
});
