import { expect, test } from "@jest/globals";
import isBalanced from "../../../src/preflight/structured/balanced.mjs";

test("checks nested delimiters while ignoring quoted delimiters", () => {
  expect(isBalanced('{ key: "escaped \\\" }" }')).toBe(true);
  expect(isBalanced("{ nested { value } }")).toBe(true);
  expect(isBalanced("{ unmatched")).toBe(false);
  expect(isBalanced("}")).toBe(false);
  expect(isBalanced("'unterminated")).toBe(false);
  expect(isBalanced("(value)", "()")).toBe(true);
});
