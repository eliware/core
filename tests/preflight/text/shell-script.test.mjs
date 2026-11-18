import { expect, test } from "@jest/globals";
import validateShellScript from "../../../src/preflight/text/shell-script.mjs";

test("routes shell scripts and ignores other files", () => {
  expect(validateShellScript("scripts/check.sh", "echo ok\n")[0]).toContain(
    "interpreter line is required",
  );
  expect(validateShellScript("scripts/check.mjs", "echo ok\n")).toEqual([]);
});
