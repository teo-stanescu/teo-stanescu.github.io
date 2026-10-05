import { describe, it, expect, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const tmps: string[] = [];
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "site-build-"));
  tmps.push(d);
  return d;
};
afterAll(() => tmps.forEach((d) => rmSync(d, { recursive: true, force: true })));

function copyPublic(dest: string): void {
  cpSync(join(ROOT, "public"), dest, { recursive: true });
  rmSync(join(dest, "cv.pdf"), { force: true });
}

function build(publicDir: string, outDir: string) {
  return spawnSync("npx", ["vite", "build", "--outDir", outDir, "--emptyOutDir"], {
    cwd: ROOT,
    env: { ...process.env, SITE_PUBLIC_DIR: publicDir },
    encoding: "utf8",
  });
}

describe("builds", () => {
  it("dist-build-cv-absent-exits-0", () => {
    const t = tmp();
    const pub = join(t, "public-a");
    copyPublic(pub);
    const r = build(pub, join(t, "out-a"));
    expect(r.status, r.stderr).toBe(0);
    expect(readFileSync(join(t, "out-a/index.html"), "utf8")).not.toContain("cv.pdf");
    expect(existsSync(join(t, "out-a/cv.pdf"))).toBe(false);
  }, 180_000);

  it("dist-build-cv-present-links", () => {
    const t = tmp();
    const pub = join(t, "public-b");
    copyPublic(pub);
    writeFileSync(join(pub, "cv.pdf"), "%PDF-1.4\n%%EOF\n");
    const r = build(pub, join(t, "out-b"));
    expect(r.status, r.stderr).toBe(0);
    const html = readFileSync(join(t, "out-b/index.html"), "utf8");
    expect(html).toMatch(/<a[^>]*href="\/cv\.pdf"[^>]*>Download CV \(PDF\)<\/a>/);
    expect(existsSync(join(t, "out-b/cv.pdf"))).toBe(true);
  }, 180_000);

  it("dist-content-edit-roundtrip", () => {
    const t = tmp();
    const copy = join(t, "site");
    for (const f of ["index.html", "src", "scripts", "public", "package.json", "tsconfig.json", "vite.config.ts"]) {
      cpSync(join(ROOT, f), join(copy, f), { recursive: true });
    }
    rmSync(join(copy, "public/cv.pdf"), { force: true });
    symlinkSync(join(ROOT, "node_modules"), join(copy, "node_modules"));
    const file = join(copy, "src/content.ts");
    const src = readFileSync(file, "utf8");
    const edited = src.replace(/title: "Principal Engineer",/, 'title: "Roundtrip Test Title",');
    expect(edited).not.toBe(src);
    writeFileSync(file, edited);
    const r = spawnSync("npx", ["vite", "build"], { cwd: copy, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    const html = readFileSync(join(copy, "dist/index.html"), "utf8");
    expect(html).toContain("Roundtrip Test Title");
    expect(/<p class="hero-title">([^<]*)<\/p>/.exec(html)![1]).toBe("Roundtrip Test Title");
    const hero = /<header class="hero">[\s\S]*?<\/header>/.exec(html)![0];
    expect(hero).not.toContain("Principal Engineer");
  }, 180_000);
});
