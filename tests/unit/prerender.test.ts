import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { entryPath, injectHtml } from "../../scripts/prerender-plugin";

const parts = { head: "<title>H</title>", html: "<main>B</main>" };

it("prerender-missing-marker-throws", () => {
  expect(() => injectHtml("<html></html>", parts)).toThrow("prerender: index.html lacks <!--app-html-->");
  expect(() => injectHtml("<html><!--app-html--></html>", parts)).toThrow(
    "prerender: index.html lacks <!--app-head-->",
  );
});

it("prerender-injects-head-and-body", () => {
  const out = injectHtml("<head><!--app-head--></head><body><!--app-html--></body>", parts);
  expect(out).toBe("<head><title>H</title></head><body><main>B</main></body>");
});

it("prerender-entry-from-config-root", () => {
  expect(entryPath("/some/root")).toBe(resolve("/some/root", "src/entry-server.tsx"));
});

it("prerender-build-from-other-cwd", () => {
  const out = mkdtempSync(join(tmpdir(), "prerender-"));
  try {
    execFileSync(
      resolve("node_modules/.bin/vite"),
      ["build", resolve("."), "--outDir", join(out, "dist"), "--emptyOutDir"],
      { cwd: out, stdio: "pipe" },
    );
    expect(readFileSync(join(out, "dist", "index.html"), "utf8")).toContain("<main id=\"main\"");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}, 30000);
