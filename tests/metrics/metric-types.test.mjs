import { expect, test } from "@jest/globals";
import classifyMetricType from "../../src/metrics/metric-types.mjs";

test("classifies supported router and service metric types", () => {
  expect(classifyMetricType("frr")).toBe("router");
  expect(classifyMetricType("dns-cache")).toBe("service");
  expect(classifyMetricType("ntp")).toBe("service");
  expect(classifyMetricType("unknown")).toBeUndefined();
});
