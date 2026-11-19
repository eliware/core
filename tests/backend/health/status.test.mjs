import { expect, test } from "@jest/globals";
import createHealthStatus from "../../../src/backend/health/status.mjs";

test("reports unconfigured health when no units exist", () => {
  expect(createHealthStatus([])).toEqual({ status: "unconfigured", checkedAt: null, units: [] });
});

test("reports unknown health before all configured units pass", () => {
  expect(
    createHealthStatus([{ name: "named.service", status: "unknown", checkedAt: null }]),
  ).toEqual({
    status: "unknown",
    checkedAt: null,
    units: [{ name: "named.service", status: "unknown", checkedAt: null }],
  });
});

test("reports healthy status and the latest check time", () => {
  const checks = [
    { name: "named.service", status: "healthy", checkedAt: "2026-11-18T12:00:00.000Z" },
    { name: "frr.service", status: "healthy", checkedAt: "2026-11-18T12:01:00.000Z" },
  ];
  expect(createHealthStatus(checks)).toEqual({
    status: "healthy",
    checkedAt: "2026-11-18T12:01:00.000Z",
    units: checks,
  });
});

test("reports unhealthy status when any unit fails", () => {
  const checks = [
    { name: "named.service", status: "healthy", checkedAt: "2026-11-18T12:00:00.000Z" },
    { name: "frr.service", status: "unhealthy", checkedAt: "2026-11-18T12:01:00.000Z" },
  ];
  expect(createHealthStatus(checks)).toMatchObject({
    status: "unhealthy",
    checkedAt: "2026-11-18T12:01:00.000Z",
    units: checks,
  });
});
