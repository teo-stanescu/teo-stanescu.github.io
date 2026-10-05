import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const PROSE_ATTRS = new Set(["alt", "title", "aria-label", "placeholder"]);
const HAS_LETTER = /\p{L}/u;

export function findCvText(source, fileName) {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = [];
  const add = (node, what) => {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    found.push({ file: fileName, line, message: `${what}` });
  };
  const visit = (node) => {
    if (ts.isJsxText(node) && HAS_LETTER.test(node.text)) add(node, "CV text in component");
    if (
      ts.isJsxAttribute(node) &&
      PROSE_ATTRS.has(node.name.getText(sf)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      HAS_LETTER.test(node.initializer.text)
    ) {
      add(node, "CV text in component");
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function tsxFiles(path) {
  if (statSync(path).isFile()) return path.endsWith(".tsx") ? [path] : [];
  return readdirSync(path).flatMap((n) => tsxFiles(join(path, n)));
}

function main(argv) {
  if (argv.length === 0) {
    console.error("usage: check-no-cv-text.mjs <file-or-dir>...");
    return 1;
  }
  let bad = 0;
  for (const file of argv.flatMap(tsxFiles)) {
    for (const f of findCvText(readFileSync(file, "utf8"), file)) {
      console.error(`${f.file}:${f.line}: ${f.message}`);
      bad++;
    }
  }
  return bad > 0 ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
