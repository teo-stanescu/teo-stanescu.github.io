// Generates public/og-card.png (1200x630): name, title and the mission-log label.
// Text comes from src/content.ts. Colours and type follow the site tokens.
// Run once with: node scripts/make-og.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { module } = await runnerImport("/src/content.ts", { root });
const { person, labels } = module.content;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const font = readFileSync(resolve(root, "public/fonts/inter-latin.woff2")).toString("base64");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Inter";src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#0B0F14;color:#E6EAF0;font-family:"Inter",system-ui,sans-serif;
  padding:88px 96px;display:flex;flex-direction:column;justify-content:center;border-left:8px solid #E8A94A}
.eyebrow{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:28px;font-weight:500;
  letter-spacing:.08em;text-transform:uppercase;color:#E8A94A;margin-bottom:32px}
h1{font-size:112px;line-height:1.1;font-weight:700;margin-bottom:24px}
p{font-size:48px;line-height:1.3;font-weight:400;color:#9AA6B4}
</style></head><body>
<div class="eyebrow">${esc(labels.eyebrow)}</div>
<h1>${esc(person.name)}</h1>
<p>${esc(person.title)}</p>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  writeFileSync(resolve(root, "public/og-card.png"), await page.screenshot({ type: "png" }));
} finally {
  await browser.close();
}
