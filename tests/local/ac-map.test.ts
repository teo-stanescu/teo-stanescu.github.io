import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Traceability check. The run folder is git-ignored, so this test runs only where it exists.
const RUN = "docs/guild/icm/20261006-v1-1-search-nav-motifs/stages";
const SPEC = `${RUN}/01-define/output/spec.md`;
const MAP = `${RUN}/04-plan/output/ac-test-map.md`;

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

describe.skipIf(!existsSync(SPEC) || !existsSync(MAP))("ac map", () => {
  it("local-ac-test-map-complete", () => {
    const spec = readFileSync(SPEC, "utf8");
    const map = readFileSync(MAP, "utf8");
    const specIds = new Set(spec.match(/\*\*AC-\d+\*\*/g)?.map((m) => m.slice(2, -2)) ?? []);
    expect(specIds.size).toBeGreaterThan(40);

    const rows = map.split("\n").filter((l) => /^\|\s*AC-\d+\s*\|/.test(l));
    const mapped = new Set(rows.map((l) => l.split("|")[1]!.trim()));
    expect([...specIds].filter((id) => !mapped.has(id))).toEqual([]);

    const corpus = walk("tests")
      .filter((f) => /\.(ts|tsx|mjs)$/.test(f))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    const missing: string[] = [];
    for (const row of rows) {
      const names = row.split("|")[2]!.match(/`([^`]+)`/g)?.map((n) => n.slice(1, -1)) ?? [];
      for (const name of names) {
        if (name.startsWith("review-")) continue;
        if (!corpus.includes(`"${name}"`) && !corpus.includes(`'${name}'`) && !corpus.includes(`\`${name}\``)) {
          missing.push(name);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
