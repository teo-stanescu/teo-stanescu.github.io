import { describe, expect, it } from "vitest";
import { reportTodos } from "../../scripts/report-todos.mjs";

describe("report-todos", () => {
  it("check-todo-list-report", () => {
    const fixture = [
      'import { todo } from "./model";',
      'const a = todo("first note");',
      "const b = 1;",
      'const c = { x: todo("second note") };',
    ].join("\n");
    const out: string = reportTodos(fixture);
    const lines = out.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('2: todo("first note")');
    expect(lines[1]).toBe('4: todo("second note")');
    expect(lines[2]).toBe("count: 2");
  });
});
