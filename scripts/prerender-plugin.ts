import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { runnerImport, type Plugin, type ViteDevServer } from "vite";

export function injectHtml(template: string, parts: { head: string; html: string }): string {
  for (const marker of ["<!--app-html-->", "<!--app-head-->"]) {
    if (!template.includes(marker)) throw new Error(`prerender: index.html lacks ${marker}`);
  }
  // Function replacers keep "$" in the content from acting as a pattern.
  return template
    .replace("<!--app-head-->", () => parts.head)
    .replace("<!--app-html-->", () => parts.html);
}

export function prerender(): Plugin {
  let server: ViteDevServer | undefined;
  let hasCv = false;
  let base = "/";
  const entry = "/src/entry-server.tsx";

  return {
    name: "prerender",
    configResolved(config) {
      base = config.base;
      hasCv = existsSync(resolve(config.publicDir, "cv.pdf"));
    },
    configureServer(s) {
      server = s;
    },
    async transformIndexHtml(html) {
      const mod = server
        ? await server.ssrLoadModule(entry)
        : (await runnerImport<typeof import("../src/entry-server")>(entry)).module;
      return injectHtml(html, mod.render({ hasCv, base }));
    },
  };
}
