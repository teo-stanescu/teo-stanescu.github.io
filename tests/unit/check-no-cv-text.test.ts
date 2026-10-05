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

  it("nocvtext-flags-expression-strings", () => {
    const bad = [
      '<p>{"Hello"}</p>',
      "<p>{`Hello`}</p>",
      "<p>{`a ${x} b`}</p>",
      '<p>{x ? "Yes" : "No"}</p>',
      '<a aria-label={"Menu"} />',
      "<p>2017 12</p>",
      '<a aria-description="Menu" />',
      '<a aria-roledescription="Menu" />',
      '<a data-role="Lead" />',
      '<a label="Menu" />',
      '<a placeholder={"Name"} />',
    ];
    for (const src of bad) expect(findCvText(`const a = ${src};`, "x.tsx").length, src).toBeGreaterThan(0);
  });

  it("nocvtext-allows-plumbing", () => {
    const ok = [
      '<a className="btn" href={`${base}cv.pdf`} id={`stage-${s.id}`} key="k" />',
      '<a aria-hidden="true" data-t="state" data-x={v} />',
      '<link rel="icon" href="data:," />',
      "<p>{labels.x}</p>",
      '<p>{" "}</p>',
      "<p>{a ?? \"\"}</p>",
    ];
    for (const src of ok) expect(findCvText(`const a = ${src};`, "x.tsx"), src).toEqual([]);
  });

  it("nocvtext-entities-are-glyphs", () => {
    expect(findCvText("const a = <p>&nbsp;</p>;", "x.tsx")).toEqual([]);
    expect(findCvText("const a = <p>&mdash;&#8212;</p>;", "x.tsx")).toEqual([]);
    expect(findCvText("const a = <p>&nbsp;Hi</p>;", "x.tsx")).toHaveLength(1);
  });

  it("nocvtext-scans-ts-files", () => {
    expect(findCvText('export const t = "Principal Engineer";', "x.ts")).toHaveLength(1);
    expect(findCvText('import a from "./a";\nexport type T = "x";\nexport const n = 1;', "x.ts")).toEqual([]);
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
