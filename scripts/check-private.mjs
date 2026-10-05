import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const DEFAULT_LIST = ".private/denylist.txt";
// Phone shapes: a leading "+", or a leading "0" with separators, or 3-digit groups joined by "." or "-".
const SEP = "[ .()-]{1,3}";
const PHONE = new RegExp(
  [
    `\\+\\d{1,3}(?:${SEP.replace("{1,3}", "{0,3}")}\\d){7,12}`,
    `0\\d{2,3}(?:${SEP}\\d{2,4}){2,3}`,
    `\\d{3}([.-])\\d{3}\\1\\d{3,4}`,
  ]
    .map((a) => `(?<![\\w.+])(?:${a})(?!\\w|\\.\\d)`)
    .join("|"),
);

export function normalise(s) {
  const t = s
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return t === "" ? "" : ` ${t} `;
}

export function loadList(path = process.env.CHECK_PRIVATE_LIST || DEFAULT_LIST) {
  if (!existsSync(path)) {
    throw new Error(
      `Private list not found: ${path} (default ${DEFAULT_LIST}). The owner must create it, one entry per line.`,
    );
  }
  const entries = [];
  readFileSync(path, "utf8")
    .split(/\r?\n/)
    .forEach((raw, i) => {
      if (raw.trim() === "" || raw.trim().startsWith("#")) return;
      const text = normalise(raw);
      if (text !== "") entries.push({ n: i + 1, text });
    });
  if (entries.length === 0) {
    throw new Error(`Private list is empty. Add entries to ${DEFAULT_LIST}.`);
  }
  return entries;
}

const JOIN_MIN = 5;

export function scanText(text, entries) {
  const hits = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const norm = normalise(raw);
    const joined = norm.replace(/ /g, "");
    for (const e of entries) {
      const core = e.text.trim();
      const multi = core.includes(" ");
      if (
        norm.includes(e.text) ||
        (multi && core.length >= JOIN_MIN && joined.includes(core.replace(/ /g, "")))
      ) {
        hits.push({ line, kind: "entry", n: e.n });
      }
    }
    if (PHONE.test(raw)) hits.push({ line, kind: "phone" });
  });
  return hits;
}

export function formatHit(path, h) {
  return h.kind === "entry"
    ? `${path}:${h.line}: private entry #${h.n}`
    : `${path}:${h.line}: phone pattern`;
}

export function checkStagedPaths(paths) {
  return paths
    .filter((p) => p === ".private" || p.startsWith(".private/"))
    .map((p) => `${p}: path under .private/ must never be committed`);
}

function walk(dir, base, out) {
  for (const name of readdirSync(join(base, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(base, rel)).isDirectory()) walk(rel, base, out);
    else out.push(rel);
  }
}

export function filesToScan(root = ".") {
  const tracked = execFileSync("git", ["-c", "core.quotePath=false", "ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  const dist = [];
  if (existsSync(join(root, "dist"))) walk("dist", root, dist);
  return [...new Set([...tracked, ...dist])];
}

const isBinary = (buf) => buf.subarray(0, 8000).includes(0);

function report(path, buf, entries) {
  if (isBinary(buf)) {
    console.error(`warning: ${path}: binary file, not scanned`);
    return 0;
  }
  const hits = scanText(buf.toString("utf8"), entries);
  for (const h of hits) console.error(formatHit(path, h));
  return hits.length;
}

function main(argv) {
  let entries;
  try {
    entries = loadList();
  } catch (e) {
    console.error(e.message);
    return 1;
  }
  let found = 0;
  if (argv[0] === "--message" && argv[1]) {
    const hits = scanText(readFileSync(argv[1], "utf8"), entries);
    for (const h of hits) console.error(formatHit("commit message", h));
    found += hits.length;
  } else if (argv[0] === "--staged") {
    const names = execFileSync(
      "git",
      ["-c", "core.quotePath=false", "diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR"],
      { encoding: "utf8" },
    )
      .split("\0")
      .filter(Boolean);
    const bad = checkStagedPaths(names);
    for (const b of bad) console.error(b);
    found += bad.length;
    for (const p of names) {
      if (p === ".private" || p.startsWith(".private/")) continue;
      found += report(p, execFileSync("git", ["show", `:${p}`], { maxBuffer: 1 << 28 }), entries);
    }
  } else {
    for (const p of filesToScan()) {
      if (!existsSync(p)) {
        console.error(`warning: ${p}: tracked path missing, not scanned`);
        continue;
      }
      found += report(p, readFileSync(p), entries);
    }
  }
  return found > 0 ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
