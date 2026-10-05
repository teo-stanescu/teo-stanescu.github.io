import { test, expect } from "@playwright/test";

// Chromium maps colorScheme "no-preference" to light: (prefers-color-scheme: light) matches.
// So the dark theme is tested with the "dark" emulation. The dark tokens also sit in :root.
test.describe("dark default", () => {
  test.use({ colorScheme: "dark" });
  test("e2e-theme-dark-default", async ({ page }) => {
    await page.goto("/");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(11, 15, 20)");
  });
});

test.describe("light", () => {
  test.use({ colorScheme: "light" });
  test("e2e-theme-light", async ({ page }) => {
    await page.goto("/");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(246, 247, 249)");
  });
});
