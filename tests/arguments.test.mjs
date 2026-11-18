import { expect, test } from "@jest/globals";
import parseArguments from "../src/arguments.mjs";

test.each([
  [[], { type: "help" }],
  [["--help"], { type: "help" }],
  [["--version"], { type: "version" }],
  [["preflight"], { type: "preflight" }],
  [["compare", "../core2"], { type: "compare", partnerRepo: "../core2" }],
  [["compare"], { type: "unknown", argument: "compare" }],
  [["preflight", "extra"], { type: "unknown", argument: "preflight" }],
  [["--unknown"], { type: "unknown", argument: "--unknown" }],
  [["--version", "extra"], { type: "unknown", argument: "--version" }],
])("classifies arguments %j", (args, expected) => {
  expect(parseArguments(args)).toEqual(expected);
});
