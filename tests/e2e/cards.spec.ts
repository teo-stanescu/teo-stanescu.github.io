import { test, expect, type Page } from "@playwright/test";

// Chromium does not put "expanded" in ariaSnapshot() for a summary, so read the full tree.
async function focusedExpanded(page: Page): Promise<boolean | undefined> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Accessibility.enable");
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  const focused = nodes.find((n) => n.role?.value === "DisclosureTriangle" && n.properties?.some((p) => p.name === "focused" && p.value.value));
  return focused?.properties?.find((p) => p.name === "expanded")?.value.value as boolean | undefined;
}

test("e2e-stage-order", async ({ page }) => {
  await page.goto("/");
  const h2 = page.locator("h2", { hasText: /^Stage/ });
  const n = await h2.count();
  expect(n).toBe(4);
  let prev = -Infinity;
  for (let i = 0; i < n; i++) {
    const el = h2.nth(i);
    await expect(el).toContainText(`Stage ${3 - i}`);
    const y = (await el.boundingBox())!.y + (await page.evaluate(() => window.scrollY));
    expect(y).toBeGreaterThan(prev);
    prev = y;
  }
  const skills = page.locator("h2", { hasText: "Skills and languages" });
  expect((await skills.boundingBox())!.y + (await page.evaluate(() => window.scrollY))).toBeGreaterThan(prev);
});

test("e2e-details-keyboard", async ({ page }) => {
  await page.goto("/");
  const summaries = page.locator("summary");
  const n = await summaries.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const summary = summaries.nth(i);
    const details = page.locator("details").nth(i);
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await expect(details.locator("li").first()).toBeVisible();
    await expect(summary).toBeFocused();
    expect(await focusedExpanded(page)).toBe(true);
    await page.keyboard.press("Space");
    await expect(details).not.toHaveAttribute("open", "");
    expect(await focusedExpanded(page)).toBe(false);
    await expect(summary).toBeFocused();
  }
});
