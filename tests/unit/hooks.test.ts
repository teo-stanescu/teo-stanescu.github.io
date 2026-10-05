import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { accessSync, constants, readFileSync, mkdtempSync, writeFileSync } from "node:fs";
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
    const run = (msg: string) => {
      const f = join(mkdtempSync(join(tmpdir(), "msg-")), "MSG");
      writeFileSync(f, msg + "\n");
      return spawnSync(".githooks/commit-msg", [f]).status;
    };
    expect(run("Add stuff")).toBe(1);
    expect(run("feat(x): add stuff")).toBe(0);
  });
});
