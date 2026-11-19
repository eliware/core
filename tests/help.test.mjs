import { expect, jest, test } from "@jest/globals";
import writeHelp from "../src/help.mjs";

test("writes the command usage", () => {
  const write = jest.fn();

  writeHelp(write);

  expect(write).toHaveBeenNthCalledWith(1, "Usage: core-cli [--help|--version]");
  expect(write).toHaveBeenNthCalledWith(2, "       core-cli preflight");
  expect(write).toHaveBeenNthCalledWith(3, "       core-cli catalog");
  expect(write).toHaveBeenNthCalledWith(4, "       core-cli compare <partner repo>");
  expect(write).toHaveBeenNthCalledWith(5, "       core-cli status [component] [--repo <path>]");
  expect(write).toHaveBeenNthCalledWith(6, "       core-cli reload [component] [--repo <path>]");
  expect(write).toHaveBeenNthCalledWith(
    7,
    "Validate, inspect, and operate configured router components.",
  );
  expect(write).toHaveBeenNthCalledWith(8, "--help     Print this help.");
  expect(write).toHaveBeenNthCalledWith(9, "--version  Print the package version.");
  expect(write).toHaveBeenNthCalledWith(10, "No arguments print this help.");
  expect(write).toHaveBeenNthCalledWith(
    19,
    "Validation, status, or reload failures set exit code 1.",
  );
});
