import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { runnerImport, type Plugin, type ResolvedConfig, type ViteDevServer } from "vite";

export function injectHtml(template: string, parts: { head: string; html: string }): string {
  for (const marker of ["<!--app-html-->", "<!--app-head-->"]) {
    if (!template.includes(marker)) throw new Error(`prerender: index.html lacks ${marker}`);
  }
  // Function replacers keep "$" in the content from acting as a pattern.
  return template
    .replace("<!--app-head-->", () => parts.head)
    .replace("<!--app-html-->", () => parts.html);
}

export const entryPath = (root: string): string => resolve(root, "src/entry-server.tsx");

export function prerender(): Plugin {
  let server: ViteDevServer | undefined;
  let config: ResolvedConfig;

  return {
    name: "prerender",
    configResolved(c) {
      config = c;
    },
    configureServer(s) {
      server = s;
    },
    async transformIndexHtml(html) {
      const entry = entryPath(config.root);
      // Build mode loads the entry with the project config: same root, plugins, alias and define.
      const mod = server
        ? await server.ssrLoadModule(entry)
        : (
            await runnerImport<typeof import("../src/entry-server")>(entry, {
              root: config.root,
              mode: config.mode,
              configFile: config.configFile,
            })
          ).module;
      const hasCv = existsSync(resolve(config.publicDir, "cv.pdf"));
      if (!hasCv && config.command === "build") {
        this.warn("public/cv.pdf is absent: the hero omits the CV button");
      }
      return injectHtml(html, mod.render({ hasCv, base: config.base }));
    },
  };
}
