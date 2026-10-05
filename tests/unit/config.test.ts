import { it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

it("config-github-url-single-source", () => {
  const holders = walk("src").filter((f) =>
    readFileSync(f, "utf8").includes("github.com/teo-stanescu"),
  );
  expect(holders).toEqual([join("src", "config.ts")]);
});
