import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  use: { baseURL: "http://localhost:4173" },
  webServer: {
    command: "npm run build && npm run preview",
    port: 4173,
    // A fresh build for every run is the intent, so an old preview must not serve stale files.
    // If port 4173 is busy: find the process with `lsof -i :4173`, stop it, and run again.
    reuseExistingServer: false,
  },
});
