import { expect, test } from "@jest/globals";
import parseArguments from "../src/arguments.mjs";

test.each([
  [[], { type: "help" }],
  [["--help"], { type: "help" }],
  [["--version"], { type: "version" }],
  [["preflight"], { type: "preflight" }],
  [["catalog"], { type: "catalog" }],
  [["status"], { type: "status", componentId: undefined, repositoryPath: undefined }],
  [["status", "dns"], { type: "status", componentId: "dns", repositoryPath: undefined }],
  [
    ["reload", "--repo", "../router"],
    { type: "reload", componentId: undefined, repositoryPath: "../router" },
  ],
  [
    ["reload", "dns", "--repo", "../router"],
    { type: "reload", componentId: "dns", repositoryPath: "../router" },
  ],
  [["compare", "../core2"], { type: "compare", partnerRepo: "../core2" }],
  [["compare"], { type: "unknown", argument: "compare" }],
  [["status", "dns", "kea"], { type: "invalid", command: "status" }],
  [["reload", "--repo"], { type: "invalid", command: "reload" }],
  [["status", "--repo", "--bad"], { type: "invalid", command: "status" }],
  [["preflight", "extra"], { type: "unknown", argument: "preflight" }],
  [["--unknown"], { type: "unknown", argument: "--unknown" }],
  [["--version", "extra"], { type: "unknown", argument: "--version" }],
])("classifies arguments %j", (args, expected) => {
  expect(parseArguments(args)).toEqual(expected);
});
