import { expect, test } from "@jest/globals";
import formatCliError from "../../src/cli/error-output.mjs";

test.each([
  ["catalog", new Error("catalog is invalid"), "Catalog error: catalog is invalid"],
  ["invalid", "reload", "Invalid arguments for reload."],
  ["unknown", "--unknown", "Unknown argument: --unknown"],
])("formats %s command errors", (type, value, expected) => {
  expect(formatCliError(type, value)).toBe(expected);
});
