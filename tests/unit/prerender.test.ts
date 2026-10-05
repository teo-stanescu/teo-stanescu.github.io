import { it, expect } from "vitest";
import { injectHtml } from "../../scripts/prerender-plugin";

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
