import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as cp from "../../scripts/check-private.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "chkpriv-"));
const list = (lines: string[]) => {
  const p = join(tmp(), "list.txt");
  writeFileSync(p, lines.join("\n") + "\n");
  return p;
};

const SCRIPT = resolve("scripts/check-private.mjs");
const cleanEnv = () => {
  const e: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (!k.startsWith("GIT_") && v !== undefined) e[k] = v;
  return e;
};
const git = (root: string, ...a: string[]) =>
  execFileSync("git", ["-c", "core.quotePath=false", ...a], { cwd: root, env: cleanEnv() });
const mkRepo = () => {
  const root = tmp();
  git(root, "init", "-q");
  return root;
};
const cli = (root: string, listPath: string, ...args: string[]) =>
  spawnSync("node", [SCRIPT, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...cleanEnv(), CHECK_PRIVATE_LIST: listPath },
  });
const join2 = (sep: string, ...p: string[]) => p.join(sep);

describe("check-private", () => {
  it("private-missing-list-fails", () => {
    expect(() => cp.loadList(join(tmp(), "absent.txt"))).toThrow(/\.private\/denylist\.txt.*create/is);
    const other = join(tmp(), "elsewhere.txt");
    expect(() => cp.loadList(other)).toThrow(other);
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
    expect(cp.scanText("call " + join2(" ", "+40", "712", "345", "678") + " now", none)).toHaveLength(1);
    expect(cp.scanText("call " + join2(".", "0712", "345", "678"), none)).toHaveLength(1);
    expect(cp.scanText("call " + join2(" ", "+40 (712)", "345", "678"), none)).toHaveLength(1);
    expect(cp.scanText("call " + join2(" - ", "0712", "345", "678"), none)).toHaveLength(1);
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

  it("private-phone-no-false-positives", () => {
    const none = cp.loadList(list(["zzz"]));
    for (const t of [
      '<svg viewBox="0 0 1000 2000">',
      "years 2014 2015 2016",
      "years 2014, 2015, 2016",
      "value 1073741823",
      "ts 1700000000000",
      "range 2014-2015-2016",
    ]) {
      expect(cp.scanText(t, none), t).toHaveLength(0);
    }
  });

  it("private-joined-form-match", () => {
    const e = cp.loadList(list(["zorblax bank", "zo b"]));
    expect(cp.scanText("ZorblaxBank", e)).toHaveLength(1);
    expect(cp.scanText("zorblaxBank plc", e)).toHaveLength(1);
    // short entries (under 5 chars) are not joined-matched
    expect(cp.scanText("zob", e)).toHaveLength(0);
    // one hit per entry per line
    expect(cp.scanText("Zorblax Bank and ZorblaxBank", e)).toHaveLength(1);
  });

  it("private-nonascii-path-scanned", () => {
    const root = mkRepo();
    writeFileSync(join(root, "café.md"), "work at Zorblax Holdings\n");
    git(root, "add", "café.md");
    const lp = list(["zorblax holdings"]);
    expect(cp.filesToScan(root)).toContain("café.md");
    const r = cli(root, lp);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("café.md:1: private entry #1");
    expect(cli(root, lp, "--staged").status).toBe(1);
  });

  it("private-binary-warns", () => {
    const root = mkRepo();
    writeFileSync(join(root, "bin.dat"), Buffer.from([0x41, 0, 0x42]));
    writeFileSync(join(root, "ok.txt"), "fine\n");
    git(root, "add", "bin.dat", "ok.txt");
    const lp = list(["zorblax holdings"]);
    for (const args of [[], ["--staged"]]) {
      const r = cli(root, lp, ...args);
      expect(r.status).toBe(0);
      expect(r.stderr).toContain("bin.dat");
      expect(r.stderr).toMatch(/binary/i);
      expect(r.stderr).not.toContain("ok.txt");
    }
  });

  it("private-staged-reads-index-blob", () => {
    const root = mkRepo();
    const lp = list(["zorblax holdings"]);
    writeFileSync(join(root, "a.md"), "Zorblax Holdings\n");
    git(root, "add", "a.md");
    writeFileSync(join(root, "a.md"), "clean\n");
    expect(cli(root, lp, "--staged").status).toBe(1);
    writeFileSync(join(root, "a.md"), "clean\n");
    git(root, "add", "a.md");
    writeFileSync(join(root, "a.md"), "Zorblax Holdings\n");
    expect(cli(root, lp, "--staged").status).toBe(0);
  });

  it("private-message-mode", () => {
    const root = tmp();
    const lp = list(["zorblax holdings"]);
    const msg = join(root, "MSG");
    writeFileSync(msg, "feat(x): thanks Zorblax Holdings\n");
    const r = cli(root, lp, "--message", msg);
    expect(r.status).toBe(1);
    expect(r.stderr.toLowerCase()).not.toContain("zorblax");
    writeFileSync(msg, "feat(x): add thing\n");
    expect(cli(root, lp, "--message", msg).status).toBe(0);
  });
});
