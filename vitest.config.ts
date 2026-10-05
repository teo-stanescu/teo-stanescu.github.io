import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/dist/**/*.test.ts",
      "tests/local/**/*.test.ts",
    ],
    environment: "node",
  },
});
