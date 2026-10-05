import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Print each `todo(` note with its line number, then the count. */
export function reportTodos(source) {
  const rows = [];
  source.split("\n").forEach((text, i) => {
    const re = /todo\(\s*(["'`])((?:\\.|(?!\1).)*)\1\s*\)/g;
    for (const m of text.matchAll(re)) rows.push(`${i + 1}: todo(${m[1]}${m[2]}${m[1]})`);
  });
  return [...rows, `count: ${rows.length}`].join("\n") + "\n";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(reportTodos(readFileSync("src/content.ts", "utf8")));
}
