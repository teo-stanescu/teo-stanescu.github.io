import { describe, expect, it } from "vitest";
import { scanText } from "../../scripts/check-private.mjs";
import { content } from "../../src/content";
import { CLIENT_DESCRIPTORS, teamSizeLabel, type Role, type Todo } from "../../src/model";

const roles = (): Role[] => content.stages.flatMap((s) => [...s.roles]);
const role = (id: string): Role => {
  const r = roles().find((x) => x.id === id);
  if (!r) throw new Error(`no role ${id}`);
  return r;
};

// Every present string in a value tree. A Todo note is not content, so it is skipped.
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") {
    if ("todo" in (v as Todo)) return out;
    Object.values(v).forEach((x) => strings(x, out));
  }
  return out;
}

const UNLISTED = /\b(a|an)\s+(?:[\w'-]+\s+){0,3}(client|customer|bank|lender|insurer)s?\b/gi;
// The brief phrase "a client implementation" names no client, so it is the one allowed exception.
const BRIEF_PHRASE = /^\s+implementation\b/;
const badDescriptors = (text: string): string[] =>
  [...text.matchAll(UNLISTED)]
    .filter((m) => m[0].toLowerCase() !== "a client" || !BRIEF_PHRASE.test(text.slice(m.index! + m[0].length)))
    .map((m) => m[0])
    .filter((m) => !CLIENT_DESCRIPTORS.some((d) => d.includes(m)));

describe("content", () => {
  it("content-stage-membership", () => {
    expect(content.stages.map((s) => s.roles.map((r) => r.id))).toEqual([
      ["education"],
      ["capgemini", "hyperpanda", "spark-agency"],
      ["digital-developer", "tech-lead"],
      ["solution-architect", "principal-engineer"],
    ]);
    expect(content.stages.map((s) => s.id)).toEqual([0, 1, 2, 3]);
  });

  it("content-team-sizes", () => {
    expect(role("principal-engineer").teamSize).toBe(12);
    expect(role("solution-architect").teamSize).toBe(6);
    expect(role("tech-lead").teamSize).toBe(5);
    const others = roles().filter((r) => !["principal-engineer", "solution-architect", "tech-lead"].includes(r.id));
    expect(others.length).toBe(5);
    for (const r of others) expect(r.teamSize).toBeUndefined();
  });

  it("content-team-size-up-to-label", () => {
    const l = (id: string) => {
      const r = role(id);
      return teamSizeLabel(r.teamSize, r.teamSizeUpTo ? content.labels.upTo : undefined);
    };
    expect(content.labels.upTo).toBe("up to");
    expect(l("principal-engineer")).toBe("up to 12");
    expect(l("solution-architect")).toBe("up to 6");
    expect(l("tech-lead")).toBe("5");
    expect(role("tech-lead").teamSizeUpTo).toBeUndefined();
  });

  it("content-hyperpanda-todo-end", () => {
    const d = role("hyperpanda").dates;
    expect(d.start).toEqual({ year: 2017, month: 10 });
    expect(typeof d.end === "object" && d.end !== null && "todo" in d.end).toBe(true);
  });

  it("content-skills-languages", () => {
    expect(content.skills.map((g) => g.name)).toEqual([
      "Architecture and strategy",
      "Leadership",
      "Platform and engineering",
      "Also",
    ]);
    expect(content.skills.map((g) => g.items)).toEqual([
      [
        "Solution architecture",
        "Architecture Decision Records (ADRs)",
        "FMEA",
        "Voice of the Customer analysis",
        "platform upgrades",
        "AI adoption",
      ],
      [
        "Leading teams of up to 12",
        "work allocation and motivation",
        "customer and stakeholder relationships",
      ],
      [
        "FintechOS Platform",
        "third-party integrations and connectors",
        "formula engine",
        "TypeScript",
        "SQL Server",
        "Azure",
      ],
      ["ReactJS", "Redux", "GraphQL", "NodeJS", "neo4j", "HTML/CSS"],
    ]);
    expect(content.languages).toEqual(["English", "German"]);
  });

  it("content-no-phone-pattern", () => {
    for (const s of strings(content)) expect(scanText(s, []), s).toEqual([]);
  });

  it("content-descriptors-allowed", () => {
    for (const r of roles()) {
      const text = strings(r).join("\n").toLowerCase();
      for (const d of r.clientRefs ?? []) {
        expect(CLIENT_DESCRIPTORS).toContain(d);
        expect(text, `${r.id}: ${d}`).toContain(d.toLowerCase());
      }
    }
    expect(roles().some((r) => (r.clientRefs ?? []).length > 0)).toBe(true);
    // The type check rejects any other value.
    // @ts-expect-error "a German car lender" is not a ClientDescriptor
    const bad: Role["clientRefs"] = ["a German car lender"];
    expect(bad).toBeDefined();
  });

  it("content-no-unlisted-descriptor", () => {
    for (const s of strings(content)) expect(badDescriptors(s), s).toEqual([]);
    expect(badDescriptors("a German car lender")).toHaveLength(1);
    expect(badDescriptors("a banking client")).toEqual([]);
    expect(badDescriptors("supporting delivery for a client implementation.")).toEqual([]);
    expect(badDescriptors("supporting delivery for a client.")).toHaveLength(1);
    expect(badDescriptors("a client implementation for a German bank")).toHaveLength(1);
  });

  it("content-positioning-line-exact", () => {
    expect(content.person.positioning).toBe(
      "5+ years on banking and insurance platforms, now looking for AI-focused engineering and architecture roles.",
    );
  });

  it("content-facts-unchanged", () => {
    // Literal CV facts from v1.0.0. The test fails when one of them changes.
    const facts = [
      { id: "education", title: "Education", start: "2014-9", end: "2018-7", team: undefined },
      { id: "capgemini", title: "Software Test Engineer", start: "2018-4", end: "2021-2", team: undefined },
      { id: "hyperpanda", title: "Founder, Full Stack Developer", start: "2017-10", end: "todo", team: undefined },
      { id: "spark-agency", title: "Full Stack Developer", start: "2020-1", end: "2021-12", team: undefined },
      { id: "digital-developer", title: "Digital Developer", start: "2021-3", end: "2022-2", team: undefined },
      { id: "tech-lead", title: "Tech Lead", start: "2022-2", end: "2023-2", team: 5 },
      { id: "solution-architect", title: "Solution Architect", start: "2023-2", end: "2024-3", team: 6 },
      { id: "principal-engineer", title: "Principal Engineer", start: "2024-3", end: "present", team: 12 },
    ];
    const ym = (d: { year: number; month: number }) => `${d.year}-${d.month}`;
    const actual = roles().map((r) => ({
      id: r.id,
      title: r.title,
      start: ym(r.dates.start),
      end: r.dates.end === "present" ? "present" : "todo" in r.dates.end ? "todo" : ym(r.dates.end),
      team: r.teamSize,
    }));
    expect(actual).toEqual(facts);
  });

  it("content-details-no-duplicate-parts", () => {
    for (const r of roles()) {
      const parts = [r.context, r.decision, r.outcome].filter((x): x is string => typeof x === "string");
      for (const d of r.details) expect(parts, `${r.id}: ${String(d)}`).not.toContain(d as string);
    }
  });
});
