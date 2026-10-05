import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const HAS_TEXT = /[\p{L}\p{N}]/u;
const ENTITY = /&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]*);/gi;
const ALLOWED_DATA = new Set(["data-t"]);
const ALLOWED_ARIA = new Set(["aria-hidden"]);
const TEXT_ATTRS = new Set(["alt", "title", "placeholder", "label"]);

function isTextAttr(name) {
  if (TEXT_ATTRS.has(name)) return true;
  if (name.startsWith("aria-")) return !ALLOWED_ARIA.has(name);
  if (name.startsWith("data-")) return !ALLOWED_DATA.has(name);
  return false;
}

const isJsxNode = (n) => ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n);

// Literal text pieces in an expression. Nested JSX is skipped: the main visitor reaches it.
function literalTexts(node, out) {
  if (isJsxNode(node)) return;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) out.push([node, node.text]);
  else if (ts.isTemplateExpression(node)) {
    out.push([node, node.head.text, ...node.templateSpans.map((sp) => sp.literal.text)]);
  }
  ts.forEachChild(node, (c) => literalTexts(c, out));
}

const hasText = (parts) => parts.some((t) => HAS_TEXT.test(t));

function isTypeOrModuleLiteral(node) {
  const p = node.parent;
  return (
    ts.isLiteralTypeNode(p) ||
    ts.isImportDeclaration(p) ||
    ts.isExportDeclaration(p) ||
    ts.isExternalModuleReference(p) ||
    ts.isImportTypeNode(p) ||
    ts.isPropertyAssignment(p) && p.name === node ||
    ts.isPropertySignature(p) ||
    ts.isElementAccessExpression(p) && p.argumentExpression === node
  );
}

export function findCvText(source, fileName) {
  const kind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
  const found = [];
  const add = (node) => {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    found.push({ file: fileName, line, message: "CV text in component" });
  };
  const checkExpression = (expr) => {
    const hits = [];
    literalTexts(expr, hits);
    for (const [node, ...parts] of hits) if (hasText(parts)) add(node);
  };
  const visit = (node) => {
    if (ts.isJsxText(node) && HAS_TEXT.test(node.text.replace(ENTITY, ""))) add(node);
    if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent)) {
      checkExpression(node.expression);
    }
    if (ts.isJsxAttribute(node) && node.initializer && isTextAttr(node.name.getText(sf))) {
      const init = node.initializer;
      if (ts.isStringLiteral(init)) {
        if (HAS_TEXT.test(init.text)) add(init);
      } else if (ts.isJsxExpression(init) && init.expression) {
        checkExpression(init.expression);
      }
    }
    if (kind === ts.ScriptKind.TS) {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !isTypeOrModuleLiteral(node)) {
        if (HAS_TEXT.test(node.text)) add(node);
      } else if (ts.isTemplateExpression(node)) {
        if (hasText([node.head.text, ...node.templateSpans.map((sp) => sp.literal.text)])) add(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function sourceFiles(path) {
  if (statSync(path).isFile()) return /\.tsx?$/.test(path) && !path.endsWith(".d.ts") ? [path] : [];
  return readdirSync(path).flatMap((n) => sourceFiles(join(path, n)));
}

function main(argv) {
  if (argv.length === 0) {
    console.error("usage: check-no-cv-text.mjs <file-or-dir>...");
    return 1;
  }
  let bad = 0;
  for (const file of argv.flatMap(sourceFiles)) {
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
