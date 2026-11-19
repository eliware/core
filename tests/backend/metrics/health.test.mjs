import { expect, test } from "@jest/globals";
import metricIsUnhealthy from "../../../src/backend/metrics/health.mjs";

test.each([
  ["ntp", { synchronized: false }, true],
  ["ntp", { synchronized: true }, false],
  ["haproxy", { totals: { down: 1 }, backends: [] }, true],
  ["haproxy", { totals: { down: 0 }, backends: [{ state: "DOWN" }] }, true],
  ["haproxy", { totals: { down: 0 }, backends: [{ state: "UP" }] }, false],
  ["haproxy", { totals: { down: 0 }, backends: [{}] }, true],
  ["frr", { totals: { down: 1 } }, true],
  ["frr", { totals: { down: 0 } }, false],
  ["arp", { totals: { failed: 1 } }, true],
  ["arp", { totals: { failed: 0 } }, false],
  ["vrrp", { totals: { fault: 1 } }, true],
  ["vrrp", { totals: { fault: 0 } }, false],
  ["interfaces", {}, false],
])("classifies %s metric state", (type, values, expected) => {
  expect(metricIsUnhealthy(type, values)).toBe(expected);
});
