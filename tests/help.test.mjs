import { expect, jest, test } from "@jest/globals";
import writeHelp from "../src/help.mjs";

test("writes the command usage", () => {
  const write = jest.fn();

  writeHelp(write);

  expect(write).toHaveBeenNthCalledWith(1, "Usage: core-cli [--help|--version]");
  expect(write).toHaveBeenNthCalledWith(2, "       core-cli preflight");
  expect(write).toHaveBeenNthCalledWith(3, "       core-cli compare <partner repo>");
  expect(write).toHaveBeenNthCalledWith(4, "Validate router configuration and compare an HA pair.");
  expect(write).toHaveBeenNthCalledWith(5, "--help     Print this help.");
  expect(write).toHaveBeenNthCalledWith(6, "--version  Print the package version.");
  expect(write).toHaveBeenNthCalledWith(7, "No arguments print this help.");
  expect(write).toHaveBeenNthCalledWith(12, "Validation failures set exit code 1.");
});
