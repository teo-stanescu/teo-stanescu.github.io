import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const ADRS = ["0001-stack.md", "0002-animation.md", "0003-content-model.md"];

describe("docs", () => {
  it("repo-adr-files", () => {
    expect(readdirSync("docs/adr").sort()).toEqual(ADRS);
    for (const f of ADRS) {
      const text = read(`docs/adr/${f}`);
      for (const h of ["Status", "Context", "Decision", "Consequences"]) {
        expect(text, `${f} lacks ## ${h}`).toMatch(new RegExp(`^## ${h}\\s*$`, "m"));
      }
      expect(text).toMatch(/^## Status\s+Accepted\b/m);
    }
  });

  it("repo-adr-no-jargon", () => {
    const re = /guild|ICM|\bAC-\d|\bG[12]\b|\bU-\d|FMEA row|stage 0[0-9]|lead|red team/i;
    for (const f of ADRS) expect(read(`docs/adr/${f}`)).not.toMatch(re);
  });

  it("repo-readme-sections", () => {
    const text = read("README.md");
    for (const h of ["Setup", "Edit the content", "Checks", "CV file", "Deploy", "Rules for private data"]) {
      expect(text, `README lacks ## ${h}`).toMatch(new RegExp(`^## ${h}\\s*$`, "m"));
    }
  });

  it("docs-adr-matches-code", () => {
    const adr = read("docs/adr/0003-content-model.md");
    // No code computes a duration, so the ADR must not claim one.
    expect(adr).not.toMatch(/duration/i);
    expect(read("src/model.ts")).not.toMatch(/duration/i);
    expect(adr).toContain("Code only formats them");
    expect(adr).toMatch(/"up to"/);
  });

  it("docs-readme-hook-lists-local-tests", () => {
    const hook = read(".githooks/pre-commit");
    const readme = read("README.md");
    expect(hook).toContain("test:local");
    expect(readme).toMatch(/pre-commit hook runs[^.]*local tests/);
  });

  it("docs-no-internal-ids-in-comments", () => {
    // Source comments say the reason in plain words. Planning IDs mean nothing to a public reader.
    const re = new RegExp(["\\b(?:AC|E|D|U|QA|DEF)-\\d+\\b", "\\bTask \\d+\\b"].join("|"));
    const files: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = `${d}/${e.name}`;
        if (e.isDirectory()) walk(p);
        else if (/\.(tsx?|mjs|css)$/.test(e.name) || d === ".githooks") files.push(p);
      }
    };
    for (const d of ["src", "scripts", ".githooks", "tests/unit", "tests/e2e", "tests/dist"]) walk(d);
    expect(files.length).toBeGreaterThan(20);
    const hits = files.filter((f) => f !== "tests/unit/docs.test.ts" && re.test(read(f)));
    expect(hits).toEqual([]);
  });
});
