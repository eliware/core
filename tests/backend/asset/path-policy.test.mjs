import { expect, test } from "@jest/globals";
import { resolve } from "node:path";
import assertAssetPathWithinRoot from "../../../src/backend/asset/path-policy.mjs";

test("accepts files inside an asset root", () => {
  expect(() =>
    assertAssetPathWithinRoot(resolve("public"), resolve("public/index.html")),
  ).not.toThrow();
});

test.each(["..", "../private/secret.txt"])("rejects paths outside an asset root: %s", (path) => {
  expect(() => assertAssetPathWithinRoot(resolve("public"), resolve("public", path))).toThrow(
    "asset path must stay within its configured root",
  );
});

test("rejects the root directory and a resolved symlink outside the root", () => {
  const root = resolve("public");
  expect(() => assertAssetPathWithinRoot(root, root)).toThrow(
    "asset path must stay within its configured root",
  );
  expect(() => assertAssetPathWithinRoot(root, resolve("private/secret.txt"))).toThrow(
    "asset path must stay within its configured root",
  );
});
