import { expect, test } from "@jest/globals";
import isRouterFile from "../../src/preflight-config/router-file.mjs";

test.each([
  ["etc/named.conf", true],
  ["var/named/example.zone", true],
  ["scripts/reload.sh", true],
  ["scripts/tool.mjs", false],
  ["README.md", false],
  ["other/etc/named.conf", false],
])("classifies %s as a router file: %s", (file, expected) => {
  expect(isRouterFile(file)).toBe(expected);
});
