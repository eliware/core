import { expect, test } from "@jest/globals";
import parseHealthUnits from "../../../src/backend/config/health-units.mjs";

test("parses empty and comma-separated service names", () => {
  expect(parseHealthUnits()).toEqual([]);
  expect(parseHealthUnits("sshd.service, frr.service")).toEqual(["sshd.service", "frr.service"]);
});

test("rejects malformed unit names", () => {
  expect(() => parseHealthUnits("bad unit")).toThrow("CORE_HEALTH_UNITS");
});
