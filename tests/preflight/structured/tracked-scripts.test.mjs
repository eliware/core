import { expect, test } from "@jest/globals";
import validateTrackedScripts from "../../../src/preflight/structured/tracked-scripts.mjs";

test("requires every tracked script to have a declaration", () => {
  expect(
    validateTrackedScripts(
      "keepalived.conf",
      "track_script { check.dns\n check_proxy }",
      "vrrp_script check.dns { script /usr/bin/true }",
    ),
  ).toEqual(["FAIL keepalived.conf: tracked script check_proxy is not defined."]);
});

test("accepts declared tracked scripts with regular expression characters", () => {
  expect(
    validateTrackedScripts(
      "keepalived.conf",
      "track_script { check.dns }",
      "vrrp_script check.dns { script /usr/bin/true }",
    ),
  ).toEqual([]);
});
