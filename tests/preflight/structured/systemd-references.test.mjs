import { expect, test } from "@jest/globals";
import validateSystemdReferences from "../../../src/preflight/structured/systemd-references.mjs";

test("accepts existing Core Exec script references", () => {
  const text =
    "[Service]\nExecStart=/eliware/core1/scripts/start.sh\nExecReload=/usr/bin/reload.sh\n";
  expect(validateSystemdReferences("etc/core.service", text, ["scripts/start.sh"])).toEqual([]);
});

test("reports missing Core Exec script references with source line", () => {
  const text = "[Service]\nExecStart=/eliware/core2/scripts/missing.sh\n";
  expect(validateSystemdReferences("etc/core.service", text, [])).toEqual([
    "FAIL etc/core.service:2: referenced scripts/missing.sh file is missing.",
  ]);
});

test("ignores commands outside the managed Core directory", () => {
  const text = "[Service]\nExecStart=/usr/bin/example\nExecStartPre=/var/lib/helper\n";
  expect(validateSystemdReferences("etc/core.service", text, [])).toEqual([]);
});

test("checks paths under the generic Core prefix as repository references", () => {
  expect(
    validateSystemdReferences(
      "etc/core.service",
      "[Service]\nExecStart=/eliware/core/scripts/start.sh\n",
      [],
    ),
  ).toEqual(["FAIL etc/core.service:2: referenced scripts/start.sh file is missing."]);
});

test("resolves script references for any Core repository directory", () => {
  expect(
    validateSystemdReferences(
      "etc/core.service",
      "[Service]\nExecStart=/eliware/core3/scripts/start.sh\n",
      ["scripts/start.sh"],
    ),
  ).toEqual([]);
});
