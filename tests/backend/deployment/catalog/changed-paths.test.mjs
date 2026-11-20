import { expect, test } from "@jest/globals";
import parseChangedPaths from "../../../../src/backend/deployment/catalog/changed-paths.mjs";

test("parses ordinary changed paths and ignores empty records", () => {
  expect(parseChangedPaths("M\0etc/named.conf\0A\0README.md\0")).toEqual([
    "etc/named.conf",
    "README.md",
  ]);
});

test.each(["R100", "C100"])("parses both paths for %s records", (status) => {
  expect(parseChangedPaths(`${status}\0old/name\0new/name\0`)).toEqual(["old/name", "new/name"]);
});

test("handles missing or incomplete output", () => {
  expect(parseChangedPaths(undefined)).toEqual([]);
  expect(parseChangedPaths("M\0")).toEqual([]);
  expect(parseChangedPaths("R100\0old/name\0")).toEqual(["old/name"]);
});
