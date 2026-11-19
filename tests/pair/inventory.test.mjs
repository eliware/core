import { expect, test } from "@jest/globals";
import compareInventories from "../../src/pair/inventory.mjs";

test("reports paths missing from either repository and returns shared paths", () => {
  expect(
    compareInventories(
      new Map([
        ["shared.conf", "left"],
        ["left.conf", "left"],
      ]),
      new Map([
        ["shared.conf", "right"],
        ["right.conf", "right"],
      ]),
    ),
  ).toEqual({
    errors: ["Partner repo is missing left.conf.", "This repo is missing right.conf."],
    matchingPaths: ["shared.conf"],
  });
});

test("returns an empty inventory when both repositories contain no files", () => {
  expect(compareInventories(new Map(), new Map())).toEqual({ errors: [], matchingPaths: [] });
});
