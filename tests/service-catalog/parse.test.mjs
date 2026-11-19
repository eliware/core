import { expect, test } from "@jest/globals";
import parseServiceCatalog from "../../src/service-catalog/parse.mjs";

test("parses and validates YAML catalog content", () => {
  expect(parseServiceCatalog("version: 1\ncomponents: []").error).toContain(
    "at least one component",
  );
  expect(parseServiceCatalog("invalid: [").error).toContain("core-catalog.yaml");
});
