import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { formatRange, formatYearMonth, present, teamSizeLabel, todo } from "../../src/model";

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
});
