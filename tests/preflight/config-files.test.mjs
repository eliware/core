import { expect, test } from "@jest/globals";
import isParseableConfig from "../../src/preflight/config-files.mjs";

test.each([
  ["package.json", true],
  ["package-lock.json", true],
  ["specs/directives.yaml", true],
  ["specs/directives.yml", true],
  ["etc/sample.json", true],
  ["etc/sample.jsonc", true],
  ["etc/kea/dhcp.conf", true],
  ["etc/kea/nested/dhcp.conf", true],
  ["etc/other/dhcp.conf", false],
  ["etc/kea/dhcp.txt", false],
  ["README.md", false],
])("classifies %s as parseable config: %s", (file, expected) => {
  expect(isParseableConfig(file)).toBe(expected);
});
