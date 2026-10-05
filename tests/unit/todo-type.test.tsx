import { it, expect } from "vitest";
import { todo } from "../../src/model";

it("model-todo-not-renderable", () => {
  // @ts-expect-error a Todo object is not a valid React child
  const el = <p>{todo("x")}</p>;
  expect(typeof el).toBe("object");
});
