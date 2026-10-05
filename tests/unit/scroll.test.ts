import { describe, expect, it } from "vitest";
import { createScheduler, pickAtMidline } from "../../src/client/scroll";

const rects = [
  { top: 0, bottom: 100 },
  { top: 200, bottom: 300 },
  { top: 400, bottom: 500 },
];

describe("pickAtMidline", () => {
  it("scroll-pick-midline-card-under", () => {
    expect(pickAtMidline(rects, 250)).toBe(1);
  });
  it("scroll-pick-midline-gap-last-above", () => {
    expect(pickAtMidline(rects, 150)).toBe(0);
  });
  it("scroll-pick-midline-above-first-none", () => {
    expect(pickAtMidline([{ top: 50, bottom: 100 }], 10)).toBe(-1);
    expect(pickAtMidline([], 10)).toBe(-1);
  });
});

describe("createScheduler", () => {
  it("scroll-scheduler-one-frame-per-burst", () => {
    const queue: (() => void)[] = [];
    let runs = 0;
    const schedule = createScheduler(
      (cb) => queue.push(cb),
      () => {
        runs += 1;
      },
    );
    for (let i = 0; i < 10; i++) schedule();
    expect(queue.length).toBe(1);
    queue.shift()?.();
    expect(runs).toBe(1);
    schedule();
    expect(queue.length).toBe(1);
  });
});
