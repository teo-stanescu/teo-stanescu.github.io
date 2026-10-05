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

test("e2e-network-search-no-request", async ({ page, context }) => {
  await page.goto("/");
  await page.waitForSelector("html.search-ready");
  await page.waitForLoadState("networkidle");
  const urls: string[] = [];
  page.on("request", (r) => urls.push(r.url()));
  page.on("websocket", (w) => urls.push(w.url()));
  const input = page.getByRole("combobox");
  for (const q of ["nodejs", "architecture", "zzzzqq", "<img src=x onerror=alert(1)>"]) {
    await page.keyboard.press("/");
    await input.fill("");
    await input.pressSequentially(q);
    await page.waitForTimeout(150);
    await page.keyboard.press("Enter");
  }
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.waitForLoadState("networkidle");
  // No request starts while the user searches. Any request would also have to stay on the site origin.
  expect(urls).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  expect(new URL(page.url()).search).toBe("");
  const stored = await page.evaluate(() => localStorage.length + sessionStorage.length);
  expect(stored).toBe(0);
});
