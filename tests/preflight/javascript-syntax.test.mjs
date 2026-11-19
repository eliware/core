import { expect, jest, test } from "@jest/globals";
import checkJavaScriptSyntax from "../../src/preflight/javascript-syntax.mjs";

test("checks JavaScript files and counts successful syntax checks", () => {
  const run = jest.fn().mockReturnValue({ status: 0 });
  expect(
    checkJavaScriptSyntax("C:/repo", ["scripts/app.mjs", "README.md"], {
      run,
      nodePath: "node-test",
    }),
  ).toEqual({ count: 1, errors: [] });
  expect(run).toHaveBeenCalledWith("node-test", ["--check", "C:\\repo\\scripts\\app.mjs"], {
    cwd: "C:/repo",
    encoding: "utf8",
  });
});

test("reports syntax failures from process errors and nonzero statuses", () => {
  const run = jest
    .fn()
    .mockReturnValueOnce({ error: new Error("missing Node.js") })
    .mockReturnValueOnce({ status: 1 });
  expect(
    checkJavaScriptSyntax(".", ["one.mjs", "two.mjs"], { run, nodePath: "node-test" }),
  ).toEqual({
    count: 0,
    errors: ["FAIL JavaScript syntax: one.mjs.", "FAIL JavaScript syntax: two.mjs."],
  });
});

test("uses the default Node.js command adapter", () => {
  expect(
    checkJavaScriptSyntax(process.cwd(), ["src/preflight/javascript-syntax.mjs"]).errors,
  ).toEqual([]);
});
