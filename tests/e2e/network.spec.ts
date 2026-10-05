import { test, expect } from "@playwright/test";

test("e2e-network-same-origin-no-cookie", async ({ page, context }) => {
  const urls: string[] = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  const real = urls.filter((u) => !u.startsWith("data:"));
  expect(real.length).toBeGreaterThan(0);
  for (const u of real) expect(new URL(u).host, u).toBe("localhost:4173");
  expect(real.some((u) => u.includes("/fonts/") && u.endsWith(".woff2"))).toBe(true);
  expect(await context.cookies()).toEqual([]);
});
