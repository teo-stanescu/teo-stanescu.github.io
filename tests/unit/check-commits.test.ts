import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { isConventional } from "../../scripts/check-commits.mjs";

describe("check-commits", () => {
  it("commits-conventional-regex", () => {
    expect(isConventional("feat(hero): add cv button")).toBe(true);
    expect(isConventional("fix: typo")).toBe(true);
    expect(isConventional("Add hero")).toBe(false);
    expect(isConventional("feat:no space")).toBe(false);
    expect(isConventional("feat(Hero): x")).toBe(false);
  });

  it("commits-conventional-history", () => {
    const r = spawnSync("node", ["scripts/check-commits.mjs", "--range"], { encoding: "utf8" });
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });
});
