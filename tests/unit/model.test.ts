import { describe, expect, it } from "vitest";
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
  });
});
