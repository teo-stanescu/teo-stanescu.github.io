import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PATTERN =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9-]+\))?!?: \S.*$/;

export function isConventional(subject) {
  return PATTERN.test(subject) || /^Revert "\S.*"$/.test(subject) || /^Merge \S/.test(subject);
}

export function subjectOf(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  return lines.find((l) => l.trim() !== "" && !l.startsWith("#")) ?? "";
}

function main(argv) {
  let subjects;
  if (argv[0] === "--file" && argv[1]) {
    subjects = [subjectOf(readFileSync(argv[1], "utf8"))];
  } else if (argv[0] === "--range") {
    subjects = execFileSync("git", ["log", "--format=%s"], { encoding: "utf8" })
      .split("\n")
      .filter((s) => s.length > 0);
  } else {
    console.error("usage: check-commits.mjs --file <path> | --range");
    return 1;
  }
  const bad = subjects.filter((s) => !isConventional(s));
  for (const s of bad) console.error(`Not a conventional commit subject: ${s}`);
  return bad.length > 0 ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
