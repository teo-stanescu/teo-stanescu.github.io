import { defineConfig } from "vite";
import { prerender } from "./scripts/prerender-plugin";

export default defineConfig({
  base: "/",
  publicDir: process.env.SITE_PUBLIC_DIR ?? "public",
  build: { sourcemap: false },
  plugins: [prerender()],
});
