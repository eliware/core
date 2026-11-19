import { expect, test } from "@jest/globals";
import { resolve } from "node:path";
import assertPathWithin from "../../src/preflight-config/path-policy.mjs";

const root = resolve("C:/router");

test("accepts the repository root and a nested file", () => {
  expect(() => assertPathWithin(root, root)).not.toThrow();
  expect(() => assertPathWithin(root, resolve(root, "etc/named.conf"))).not.toThrow();
});

test.each([resolve("C:/"), resolve("C:/private/secret"), resolve("D:/private/secret")])(
  "rejects a path outside the repository",
  (file) => {
    expect(() => assertPathWithin(root, file)).toThrow(
      "Referenced file is outside the configuration repository.",
    );
  },
);
