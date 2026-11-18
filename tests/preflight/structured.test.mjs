import { expect, test } from "@jest/globals";
import validateStructured from "../../src/preflight/structured.mjs";

test("dispatches supported structured configuration files", () => {
  expect(validateStructured("etc/chrony.conf", "", [], ".", () => "")).toEqual([]);
  expect(
    validateStructured("etc/conntrackd/conntrackd.conf", "broken", [], ".", () => "")[0],
  ).toContain("Sync and General blocks");
  expect(validateStructured("etc/systemd/core.service", "", [], ".", () => "")[0]).toContain(
    "unit needs",
  );
  expect(validateStructured("etc/named.conf", "", [], ".", () => "")[0]).toContain("options block");
  expect(validateStructured("etc/keepalived/keepalived.conf", "", [], ".", () => "")[0]).toContain(
    "no VRRP instances",
  );
  expect(validateStructured("README.md", "", [], ".", () => "")).toEqual([]);
});
