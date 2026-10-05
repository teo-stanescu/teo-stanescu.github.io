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
});
