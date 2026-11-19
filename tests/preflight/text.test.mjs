import { expect, test } from "@jest/globals";
import validateText from "../../src/preflight/text.mjs";

test("dispatches each supported text format and ignores unrelated files", () => {
  expect(validateText("etc/chrony.conf", "invalid directive\n")[0]).toContain(
    "unknown chrony directive",
  );
  expect(validateText("etc/haproxy/haproxy.cfg", "frontend web\n bind\n").join(" ")).toContain(
    "global and defaults sections are required",
  );
  expect(validateText("scripts/check.sh", "echo ok\n")[0]).toContain("interpreter line");
  expect(validateText("README.md", "")).toEqual([]);
});
