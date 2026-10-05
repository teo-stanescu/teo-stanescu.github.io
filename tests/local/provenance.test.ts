import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { content } from "../../src/content";
import type { Content, Role, Todo } from "../../src/model";
import { BRIEF_FACTS } from "./brief-facts";

const BRIEF_PATH = ".private/brief.md";
const NO_BRIEF = "copy the brief to .private/brief.md";

function brief(): string {
  if (!existsSync(BRIEF_PATH)) throw new Error(NO_BRIEF);
  return readFileSync(BRIEF_PATH, "utf8");
}

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") {
    if ("todo" in (v as Todo)) return out;
    Object.values(v).forEach((x) => strings(x, out));
  }
  return out;
}

// QA-14: the scan skips only person.positioning. Nothing else is exempt.
function scanned(c: Content): string[] {
  const { positioning: _skip, ...person } = c.person;
  void _skip;
  return [person, c.seo, c.stages, c.skills, c.languages].flatMap((x) => strings(x));
}

const roleStrings = (c: Content): string[] =>
  c.stages.flatMap((s) => s.roles).flatMap((r: Role) => strings([r.context, r.decision, r.outcome, r.details]));

const NUMBER_WORDS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
};
const digits = (s: string): string =>
  s.toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g, (w) => NUMBER_WORDS[w]!);

// A digit group matches only as a whole number, so "7" does not match "2017" or "20+".
export const hasNumber = (text: string, d: string): boolean => new RegExp(`(^|\\D)${d}(?!\\d)`).test(text);

const words = (s: string): string[] =>
  s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter(Boolean);

const sentences = (s: string): string[] => s.split(/(?<=[.!?])\s+/).filter((x) => x.trim() !== "");

describe("provenance", () => {
  it("provenance-ran-locally", () => {
    expect(brief()).toMatch(/^Summary: .+/m);
  });

  it("content-summary-verbatim", () => {
    const line = brief().split(/\r?\n/).find((l) => l.startsWith("Summary: "));
    expect(line).toBeDefined();
    expect(content.person.summary).toBe(line!.slice("Summary: ".length));
  });

  it("provenance-numbers-and-names", () => {
    const b = brief();
    const lower = b.toLowerCase();
    for (const s of scanned(content)) {
      for (const d of s.match(/\d+/g) ?? []) expect(hasNumber(lower, d), `digits ${d} in "${s}"`).toBe(true);
      for (const w of s.match(/\b[A-Z][A-Za-z]*\b/g) ?? []) {
        expect(new RegExp(`\\b${w}\\b`, "i").test(b), `word ${w} in "${s}"`).toBe(true);
      }
    }
  });

  it("provenance-number-whole-token", () => {
    expect(hasNumber("since 2017 and 20+ apps", "7")).toBe(false);
    expect(hasNumber("since 2017 and 20+ apps", "201")).toBe(false);
    expect(hasNumber("since 2017 and 20+ apps", "20")).toBe(true);
    expect(hasNumber("a team of 12", "12")).toBe(true);
    expect(hasNumber("a team of 12", "2")).toBe(false);
  });

  it("provenance-number-unit-pairs", () => {
    const b = digits(brief());
    const NUM = /\b(\d+\+?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+([A-Za-z][\w-]*)/gi;
    let seen = 0;
    for (const s of scanned(content)) {
      for (const m of digits(s).matchAll(NUM)) {
        seen++;
        expect(b, `pair "${m[0]}" in "${s}"`).toContain(m[0].toLowerCase());
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("provenance-role-facts-pairing", () => {
    const all = content.stages.flatMap((s) => s.roles);
    expect(all.map((r) => r.id).sort()).toEqual(BRIEF_FACTS.map((f) => f.id).sort());
    for (const f of BRIEF_FACTS) {
      const r = all.find((x) => x.id === f.id)!;
      expect(r.dates.start, `${f.id} start`).toEqual(f.start);
      const end = r.dates.end;
      if (f.end === "open") expect(typeof end === "object" && "todo" in end, `${f.id} end`).toBe(true);
      else expect(end, `${f.id} end`).toEqual(f.end);
      expect(r.teamSize, `${f.id} team`).toBe(f.teamSize);
    }
  });

  it("provenance-sentence-overlap", () => {
    const b = ` ${words(brief()).join(" ")} `;
    for (const text of roleStrings(content)) {
      for (const sentence of sentences(text)) {
        const w = words(sentence);
        const n = Math.min(4, w.length);
        let ok = false;
        for (let i = 0; i + n <= w.length && !ok; i++) ok = b.includes(` ${w.slice(i, i + n).join(" ")} `);
        expect(ok, `no 4-word run from the brief in: ${sentence}`).toBe(true);
      }
    }
  });

  it("provenance-positioning-exempt", () => {
    brief();
    const p = content.person.positioning;
    expect(typeof p === "string" || (typeof p === "object" && "todo" in p)).toBe(true);
    const probe: Content = { ...content, person: { ...content.person, positioning: "Zz 99 Qq words" } };
    const got = scanned(probe);
    expect(got).not.toContain("Zz 99 Qq words");
    for (const k of ["name", "title", "location", "email", "summary"] as const) {
      expect(got).toContain(content.person[k]);
    }
    expect(got).toContain(content.seo.title);
  });
});
