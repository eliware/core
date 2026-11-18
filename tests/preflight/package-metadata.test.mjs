import { expect, test } from "@jest/globals";
import validatePackageMetadata from "../../src/preflight/package-metadata.mjs";

const packageJson = { name: "@eliware/core1", version: "15.2.0" };
const lock = {
  name: packageJson.name,
  version: packageJson.version,
  packages: { "": { name: packageJson.name, version: packageJson.version } },
};

test("accepts matching package metadata", () => {
  expect(
    validatePackageMetadata(packageJson, ["package-lock.json"], ".", () => JSON.stringify(lock)),
  ).toEqual([]);
});

test("reports missing and mismatched package metadata", () => {
  expect(validatePackageMetadata(undefined, [], ".", () => "")).toEqual([
    "FAIL package.json or package-lock.json is missing.",
  ]);
  expect(validatePackageMetadata(packageJson, ["package-lock.json"], ".", () => "{}")).toEqual([
    "FAIL package.json and package-lock.json names or versions do not match.",
  ]);
});

test("reports an unreadable or invalid lock file", () => {
  expect(validatePackageMetadata(packageJson, ["package-lock.json"], ".", () => "invalid")).toEqual(
    ["FAIL package-lock.json is not valid JSON."],
  );
  expect(
    validatePackageMetadata(packageJson, ["package-lock.json"], ".", () => {
      throw new Error("denied");
    }),
  ).toEqual(["FAIL package-lock.json is not valid JSON."]);
});
