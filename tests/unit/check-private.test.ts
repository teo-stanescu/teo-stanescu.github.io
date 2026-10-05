import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as cp from "../../scripts/check-private.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "chkpriv-"));
const list = (lines: string[]) => {
  const p = join(tmp(), "list.txt");
  writeFileSync(p, lines.join("\n") + "\n");
  return p;
};

describe("check-private", () => {
  it("private-missing-list-fails", () => {
    expect(() => cp.loadList(join(tmp(), "absent.txt"))).toThrow(/\.private\/denylist\.txt.*create/is);
  });

  it("private-word-boundary-match", () => {
    const e1 = cp.loadList(list(["zor"]));
    expect(cp.scanText("see Zor, today", e1)).toHaveLength(1);
    expect(cp.scanText("zorblax", e1)).toHaveLength(0);
    const e2 = cp.loadList(list(["zorblax bank"]));
    expect(cp.scanText("ZORBLAX-Bank", e2)).toHaveLength(1);
    expect(cp.scanText("Zörblax  bänk", cp.loadList(list(["zorblax bank"])))).toHaveLength(1);
  });

  it("private-phone-pattern", () => {
    const none = cp.loadList(list(["zzz"]));
    expect(cp.scanText(`call +40 712 ${"345"} ${"678"} now`, none)).toHaveLength(1);
    expect(cp.scanText(`call 0712.${"345"}.${"678"}`, none)).toHaveLength(1);
    expect(cp.scanText("2014 - 2018", none)).toHaveLength(0);
    expect(cp.scanText("version v1.2.3", none)).toHaveLength(0);
    expect(cp.scanText("sha-AbCdEf0123456789xyz+/Qw12345678901234==", none)).toHaveLength(0);
  });

  it("private-exact-values", () => {
    const e = cp.loadList(list(["Strada Zorblax 12"]));
    expect(cp.scanText("at  STRADA zorblax, 12.", e)).toHaveLength(1);
  });

  it("private-reports-no-entry-text", () => {
    const e = cp.loadList(list(["zorblax holdings", "other"]));
    const hits = cp.scanText("a\nwork for Zorblax Holdings", e);
    expect(hits).toHaveLength(1);
    const line = cp.formatHit("src/a.ts", hits[0]);
    expect(line).toBe("src/a.ts:2: private entry #1");
    expect(line.toLowerCase()).not.toContain("zorblax");
  });

  it("private-staged-rejects-private-path", () => {
    expect(cp.checkStagedPaths([".private/x.txt"]).length).toBeGreaterThan(0);
    expect(cp.checkStagedPaths(["src/a.ts"])).toHaveLength(0);
  });

  it("private-default-mode-scans-tracked-and-dist", () => {
    // Git hooks export GIT_* variables; drop them so this test uses its own repo.
    for (const k of Object.keys(process.env)) if (k.startsWith("GIT_")) delete process.env[k];
    const root = tmp();
    execFileSync("git", ["init", "-q"], { cwd: root });
    writeFileSync(join(root, "a.txt"), "x");
    execFileSync("git", ["add", "a.txt"], { cwd: root });
    mkdirSync(join(root, "dist", "assets"), { recursive: true });
    writeFileSync(join(root, "dist", "index.html"), "x");
    writeFileSync(join(root, "dist", "assets", "m.js"), "x");
    expect(cp.filesToScan(root).sort()).toEqual(["a.txt", "dist/assets/m.js", "dist/index.html"]);
  });
});
