import { describe, expect, it } from "vitest";
import { findAll, fold, locate, normalizeQuery } from "../../src/client/search-core";

describe("fold", () => {
  it("search-fold-diacritics", () => {
    expect(fold("Ă").folded).toBe("a");
    expect(fold("ș").folded).toBe("s");
    expect(fold("Ţară Ști").folded).toBe("tara sti");
  });
  it("search-fold-offset-map", () => {
    const { folded, map } = fold("Ștefan");
    expect(folded).toBe("stefan");
    expect(map).toEqual([0, 1, 2, 3, 4, 5]);
    expect(map.length).toBe(folded.length);
    // decomposed input: source has combining mark at index 1
    const d = fold("Ștefan");
    expect(d.folded).toBe("stefan");
    expect(d.map).toEqual([0, 2, 3, 4, 5, 6]);
  });
  it("search-fold-length-changing", () => {
    const { folded, map } = fold("İx");
    expect(map.length).toBe(folded.length);
    expect(map[0]).toBe(0);
    expect(map[folded.length - 1]).toBe(1);
    const e = fold("aİb");
    expect(e.map.length).toBe(e.folded.length);
    expect(e.map.filter((m) => m === 1).length).toBe(e.folded.length - 2);
  });
  it("keeps astral code points mapped to their first code unit", () => {
    const { folded, map } = fold("a\u{1F600}b");
    expect(map.length).toBe(folded.length);
    expect(map[map.length - 1]).toBe(3);
  });
});

describe("normalizeQuery and findAll", () => {
  it("search-match-case-insensitive", () => {
    const q = normalizeQuery("ABC")!;
    const r = findAll(fold("xx abc Abc").folded, q);
    expect(r.total).toBe(2);
    expect(r.ranges[0]).toEqual({ start: 3, end: 6 });
  });
  it("search-match-literal-not-regexp", () => {
    for (const raw of [".*", "((", "<img src=x onerror=alert(1)>"]) {
      const q = normalizeQuery(raw)!;
      expect(q).toBe(raw.toLowerCase());
      expect(findAll(fold("abc def").folded, q).total).toBe(0);
      const text = `a ${raw} b`;
      expect(findAll(fold(text).folded, q).total).toBe(1);
    }
  });
  it("search-query-limits", () => {
    expect(normalizeQuery("a")).toBeNull();
    expect(normalizeQuery("  a ")).toBeNull();
    expect(normalizeQuery("ab")).toBe("ab");
    expect(normalizeQuery("x".repeat(150))!.length).toBe(100);
  });
  it("search-match-max-500", () => {
    const r = findAll("ab".repeat(600), "ab");
    expect(r.ranges.length).toBe(500);
    expect(r.total).toBe(600);
  });
  it("search-match-no-overlap", () => {
    const r = findAll("aaaa", "aaa");
    expect(r.ranges).toEqual([{ start: 0, end: 3 }]);
    expect(r.total).toBe(1);
  });
});

describe("locate", () => {
  it("search-locate-across-segments", () => {
    // segments "abc" | "de" | "fgh" -> map is source index per folded unit
    const segLengths = [3, 2, 3];
    const map = [0, 1, 2, 3, 4, 5, 6, 7];
    expect(locate(map, segLengths, 1, 2)).toEqual([{ seg: 0, from: 1, to: 2 }]);
    expect(locate(map, segLengths, 2, 4)).toEqual([
      { seg: 0, from: 2, to: 3 },
      { seg: 1, from: 0, to: 1 },
    ]);
    expect(locate(map, segLengths, 1, 7)).toEqual([
      { seg: 0, from: 1, to: 3 },
      { seg: 1, from: 0, to: 2 },
      { seg: 2, from: 0, to: 2 },
    ]);
  });
  it("uses the offset map when folding changed lengths", () => {
    // source "Ăb" | "c": folded "abc"; decomposed source "Ăb" | "c"
    const { map } = fold("Ăbc");
    expect(locate(map, [3, 1], 1, 3)).toEqual([
      { seg: 0, from: 2, to: 3 },
      { seg: 1, from: 0, to: 1 },
    ]);
  });
});
