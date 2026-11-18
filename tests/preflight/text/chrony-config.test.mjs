import { expect, test } from "@jest/globals";
import validateChronyConfig from "../../../src/preflight/text/chrony-config.mjs";

test("routes Chrony configuration and ignores other files", () => {
  expect(validateChronyConfig("etc/chrony.conf", "bad value\n")[0]).toContain(
    "unknown chrony directive",
  );
  expect(validateChronyConfig("other.conf", "bad value\n")).toEqual([]);
});
