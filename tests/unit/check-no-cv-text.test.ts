import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { findCvText } from "../../scripts/check-no-cv-text.mjs";

describe("check-no-cv-text", () => {
  it("nocvtext-flags-jsx-text", () => {
    const found = findCvText("const a = <p>Hello</p>;", "x.tsx");
    expect(found).toHaveLength(1);
    expect(found[0].line).toBe(1);
    expect(findCvText("const a = <p>{label}</p>;", "x.tsx")).toHaveLength(0);
    expect(findCvText("const a = <p> - </p>;", "x.tsx")).toHaveLength(0);
  });

  it("nocvtext-flags-prose-attr", () => {
    expect(findCvText('const a = <img alt="Photo" />;', "x.tsx")).toHaveLength(1);
    expect(findCvText('const a = <a title="x y" />;', "x.tsx")).toHaveLength(1);
    expect(findCvText('const a = <a aria-label="Menu" />;', "x.tsx")).toHaveLength(1);
    expect(findCvText("const a = <a aria-label={labels.telemetry} />;", "x.tsx")).toHaveLength(0);
  });

  it("nocvtext-components-clean", () => {
    const r = spawnSync(
      process.execPath,
      ["scripts/check-no-cv-text.mjs", "src/components", "src/entry-server.tsx"],
      { encoding: "utf8" },
    );
    expect(r.stderr + r.stdout).toBe("");
    expect(r.status).toBe(0);
  });
});
