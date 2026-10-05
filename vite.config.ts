import { defineConfig } from "vite";
import { prerender } from "./scripts/prerender-plugin";

export default defineConfig({
  base: "/",
  build: { sourcemap: false },
  plugins: [prerender()],
});
