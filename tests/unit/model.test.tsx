import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  currentRole,
  formatRange,
  formatYearMonth,
  orderedStages,
  present,
  sortRoles,
  teamSizeLabel,
  todo,
  type Content,
  type Role,
  type Stage,
} from "../../src/model";
import { content } from "../../src/content";

const mk = (id: string, start: Role["dates"]["start"], end: Role["dates"]["end"]): Role => ({
  id,
  title: id,
  org: "Org",
  dates: { start, end },
  focus: "f",
  context: "c",
  decision: "d",
  outcome: "o",
  details: [],
});
const ym = (year: number, month: number) => ({ year, month });
const ids = (rs: readonly Role[]) => rs.map((r) => r.id);
const withStages = (stages: readonly Stage[]): Content => ({ ...content, stages });
const stage = (id: Stage["id"], roles: Role[]): Stage => ({
  id,
  heading: `Stage ${id}`,
  label: "l",
  telemetryName: `${id}`,
  roles,
});
const shuffled = <T,>(a: readonly T[]): T[] => [a[2], a[0], a[3], a[1], ...a.slice(4)].filter((x): x is T => x !== undefined);

describe("model", () => {
  it("model-format-year-month", () => {
    expect(formatYearMonth({ year: 2017, month: 10 })).toBe("Oct 2017");
  });

  it("model-format-range", () => {
    expect(formatRange({ start: { year: 2024, month: 3 }, end: "present" })).toBe("Mar 2024 – Present");
    expect(
      formatRange({ start: { year: 2022, month: 2 }, end: { year: 2023, month: 2 } }),
    ).toBe("Feb 2022 – Feb 2023");
  });

  it("model-open-end-todo", () => {
    expect(formatRange({ start: { year: 2017, month: 10 }, end: todo("end date") })).toBe("Oct 2017");
  });

  it("model-present-guard", () => {
    expect(present("x")).toBe(true);
    expect(present(todo("n"))).toBe(false);
    expect(present("")).toBe(false);
    expect(present(undefined)).toBe(false);
  });

  it("model-team-size-label", () => {
    expect(teamSizeLabel(12)).toBe("12");
    expect(teamSizeLabel(undefined)).toBeNull();
    expect(teamSizeLabel(12, "up to")).toBe("up to 12");
    expect(teamSizeLabel(undefined, "up to")).toBeNull();
  });

  it("model-format-year-month-bounds", () => {
    expect(formatYearMonth({ year: 2020, month: 1 })).toBe("Jan 2020");
    expect(formatYearMonth({ year: 2020, month: 12 })).toBe("Dec 2020");
    expect(() => formatYearMonth({ year: 2020, month: 0 })).toThrow();
    expect(() => formatYearMonth({ year: 2020, month: 13 })).toThrow();
  });

  describe("todo coercion", () => {
    const msg = "Todo reached output: the note";
    const t = () => todo("the note");
    it("model-todo-throws-template", () => {
      expect(() => `${t() as unknown as string}`).toThrow(msg);
    });
    it("model-todo-throws-string", () => {
      expect(() => String(t())).toThrow(msg);
    });
    it("model-todo-throws-join", () => {
      expect(() => [t()].join(" ")).toThrow(msg);
    });
    it("model-todo-throws-valueof-and-tostring", () => {
      expect(() => t().valueOf()).toThrow(msg);
      expect(() => t().toString()).toThrow(msg);
      expect(() => +(t() as unknown as number)).toThrow(msg);
    });
    it("model-todo-throws-attribute", () => {
      expect(() => renderToStaticMarkup(<p data-x={t() as unknown as string} />)).toThrow(msg);
    });
    it("model-todo-throws-json", () => {
      expect(() => JSON.stringify({ a: t() })).toThrow(msg);
    });
    it("model-todo-keeps-shape", () => {
      expect("todo" in t()).toBe(true);
      expect(t().todo).toBe("the note");
    });
  });

  describe("order", () => {
    it("model-ordered-stages-newest-first", () => {
      expect(orderedStages(content).map((s) => s.id)).toEqual([3, 2, 1, 0]);
      expect(orderedStages(withStages(shuffled(content.stages))).map((s) => s.id)).toEqual([3, 2, 1, 0]);
    });

    it("model-ordered-roles-start-desc", () => {
      const s1 = orderedStages(content).find((s) => s.id === 1)!;
      expect(s1.roles.map((r) => r.title)).toEqual([
        "Full Stack Developer",
        "Software Test Engineer",
        "Founder, Full Stack Developer",
      ]);
      expect(ids(s1.roles)).toEqual(["spark-agency", "capgemini", "hyperpanda"]);
      expect(ids(sortRoles([mk("a", ym(2020, 5), ym(2021, 1)), mk("b", ym(2020, 9), ym(2021, 1)), mk("c", ym(2019, 12), ym(2021, 1))]))).toEqual(["b", "a", "c"]);
    });

    it("model-order-present-first", () => {
      const rs = [mk("old", ym(2024, 6), ym(2025, 1)), mk("now", ym(2010, 1), "present")];
      expect(ids(sortRoles(rs))).toEqual(["now", "old"]);
    });

    it("model-order-shuffle-stable", () => {
      for (const s of content.stages) {
        const want = ids(sortRoles(s.roles));
        expect(ids(sortRoles(shuffled(s.roles)))).toEqual(want);
        expect(ids(sortRoles([...s.roles].reverse()))).toEqual(want);
      }
      const out = orderedStages(withStages(content.stages.map((s) => ({ ...s, roles: shuffled(s.roles) }))));
      expect(out.flatMap((s) => ids(s.roles))).toEqual(
        orderedStages(content).flatMap((s) => ids(s.roles)),
      );
    });

    it("model-order-ignores-todo-end", () => {
      const rs = [mk("a", ym(2017, 10), todo("end")), mk("b", ym(2018, 4), ym(2021, 2))];
      expect(() => sortRoles(rs)).not.toThrow();
      expect(ids(sortRoles(rs))).toEqual(["b", "a"]);
    });

    it("model-order-ties-keep-content-order", () => {
      const rs = [mk("a", ym(2020, 1), ym(2021, 1)), mk("b", ym(2020, 1), ym(2022, 1)), mk("c", ym(2020, 1), "present"), mk("d", ym(2020, 1), "present")];
      expect(ids(sortRoles(rs))).toEqual(["c", "d", "a", "b"]);
      expect(ids(sortRoles(rs.slice(0, 2)))).toEqual(["a", "b"]);
    });

    it("model-order-does-not-mutate", () => {
      const before = content.stages.map((s) => ids(s.roles));
      orderedStages(content);
      expect(content.stages.map((s) => ids(s.roles))).toEqual(before);
    });
  });

  describe("currentRole", () => {
    it("model-current-role-any-stage", () => {
      expect(currentRole(content).role.id).toBe("principal-engineer");
      const moved = withStages([
        stage(0, [mk("x", ym(2000, 1), "present")]),
        stage(1, [mk("y", ym(2001, 1), ym(2002, 1))]),
      ]);
      expect(currentRole(moved)).toEqual({ stage: moved.stages[0], role: moved.stages[0]!.roles[0] });
    });

    it("model-current-role-throws-unless-one", () => {
      const none = withStages([stage(0, [mk("x", ym(2000, 1), ym(2001, 1))])]);
      const two = withStages([
        stage(0, [mk("x", ym(2000, 1), "present")]),
        stage(1, [mk("y", ym(2001, 1), "present")]),
      ]);
      expect(() => currentRole(none)).toThrow("Expected exactly one current role");
      expect(() => currentRole(two)).toThrow("Expected exactly one current role");
    });
  });
});
