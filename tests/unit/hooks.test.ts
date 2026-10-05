import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { accessSync, constants, cpSync, existsSync, readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("git hooks", () => {
  it("hook-runs-checks", () => {
    accessSync(".githooks/pre-commit", constants.X_OK);
    const t = readFileSync(".githooks/pre-commit", "utf8");
    for (const c of [
      "npm run -s lint",
      "npm run -s typecheck",
      "npm test",
      "npm run -s test:local",
      "node scripts/check-private.mjs --staged",
    ]) {
      expect(t).toContain(c);
    }
  });

  it("commit-msg-hook-rejects", () => {
    accessSync(".githooks/commit-msg", constants.X_OK);
    const dir = mkdtempSync(join(tmpdir(), "msg-"));
    const lp = join(dir, "list.txt");
    writeFileSync(lp, "zorblax holdings\n");
    const env = { ...process.env, CHECK_PRIVATE_LIST: lp };
    const run = (msg: string) => {
      const f = join(dir, "MSG");
      writeFileSync(f, msg + "\n");
      return spawnSync(".githooks/commit-msg", [f], { env }).status;
    };
    expect(run("Add stuff")).toBe(1);
    expect(run("feat(x): add stuff")).toBe(0);
  });

  it("hooks-tests-hermetic-no-private-list", () => {
    // Every test that runs the commit-msg hook must pass its own list. CI has no .private folder.
    const src = readFileSync("tests/unit/hooks.test.ts", "utf8");
    const needle = ["spawnSync(", '".githooks/commit-msg"'].join("");
    const calls = src.split("\n").filter((l) => l.includes(needle));
    expect(calls.length).toBeGreaterThan(0);
    for (const l of calls) expect(l, l).toContain("env");

    // Run the hook in a copy of the repo scripts with no .private folder.
    const root = mkdtempSync(join(tmpdir(), "clean-"));
    cpSync("scripts", join(root, "scripts"), { recursive: true });
    cpSync(".githooks", join(root, ".githooks"), { recursive: true });
    const list = join(root, "list.txt");
    writeFileSync(list, "zorblax holdings\n");
    const f = join(root, "MSG");
    writeFileSync(f, "feat(x): add stuff\n");
    const env = { ...process.env, CHECK_PRIVATE_LIST: list };
    const r = spawnSync(".githooks/commit-msg", [f], { cwd: root, env });
    expect(existsSync(join(root, ".private"))).toBe(false);
    expect(r.status).toBe(0);
  });

  it("commit-msg-hook-runs-private-check", () => {
    const dir = mkdtempSync(join(tmpdir(), "msg-"));
    const lp = join(dir, "list.txt");
    writeFileSync(lp, "zorblax holdings\n");
    const f = join(dir, "MSG");
    writeFileSync(f, "feat(x): thanks Zorblax Holdings\n");
    const env = { ...process.env, CHECK_PRIVATE_LIST: lp };
    expect(spawnSync(".githooks/commit-msg", [f], { env }).status).toBe(1);
    writeFileSync(f, "feat(x): thanks all\n");
    expect(spawnSync(".githooks/commit-msg", [f], { env }).status).toBe(0);
  });

  it("hook-fails-fast-and-covers-merge", () => {
    expect(readFileSync(".githooks/pre-commit", "utf8")).toMatch(/^set -e/m);
    accessSync(".githooks/pre-merge-commit", constants.X_OK);
    expect(readFileSync(".githooks/pre-merge-commit", "utf8")).toContain("pre-commit");
  });

  it("hooks-prepare-script-installs", () => {
    const s = JSON.parse(readFileSync("package.json", "utf8")).scripts;
    expect(s.prepare).toContain("git config core.hooksPath .githooks");
  });
});
