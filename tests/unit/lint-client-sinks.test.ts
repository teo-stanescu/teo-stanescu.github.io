import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";

const eslint = new ESLint();
async function errors(code: string, filePath = "src/client/x.ts") {
  const [r] = await eslint.lintText(code, { filePath });
  return r.messages.filter((m) => m.severity === 2);
}

describe("client sink lint rule", () => {
  it("lint-bans-html-sinks-in-client", async () => {
    const bad = [
      'el.innerHTML = "x";',
      'el.outerHTML = "x";',
      'el.insertAdjacentHTML("beforeend", "x");',
      'document.write("x");',
      'range.createContextualFragment("x");',
      "new DOMParser();",
      'eval("1");',
      'new Function("1");',
    ];
    for (const code of bad) {
      const e = await errors(`${code}`);
      expect(e.length, code).toBe(1);
    }
  });
  it("lint-allows-text-content", async () => {
    expect(await errors('el.textContent = "x";')).toHaveLength(0);
  });
  it("does not ban sinks outside src/client", async () => {
    expect(await errors('el.innerHTML = "x";', "scripts/x.ts")).toHaveLength(0);
  });
});
