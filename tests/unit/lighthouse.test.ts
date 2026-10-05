import { describe, expect, it } from "vitest";
import { medianScores, failing } from "../../scripts/lighthouse.mjs";

const run = (p: number, a: number, b: number, s: number) => ({
  categories: {
    performance: { score: p },
    accessibility: { score: a },
    "best-practices": { score: b },
    seo: { score: s },
  },
});

describe("lighthouse", () => {
  it("lighthouse-median-threshold", () => {
    const med = medianScores([
      run(0.9, 1, 0.96, 1),
      run(0.99, 0.9, 1, 0.5),
      run(0.95, 0.95, 0.92, 1),
    ]);
    expect(med).toEqual({ performance: 95, accessibility: 95, "best-practices": 96, seo: 100 });
    expect(
      failing({ performance: 94, accessibility: 100, "best-practices": 100, seo: 100 }, 95),
    ).toEqual(["performance"]);
    expect(failing(med, 95)).toEqual([]);
  });
});
