import { expect, test } from "@jest/globals";
import { createHealthMonitor } from "../../test-fixtures/health-monitor-tests.mjs";

test("records systemd events in the current health status", async () => {
  const monitor = createHealthMonitor({ units: ["frr.service"], checkUnit: async () => {} });
  await monitor.check();
  await monitor.recordEvent({
    name: "frr.service",
    event: "failed",
    status: "unhealthy",
    state: "failed",
    checkedAt: "2026-11-19T12:00:00.000Z",
  });
  expect(monitor.getStatus().units[0]).toMatchObject({ status: "unhealthy", state: "failed" });
});
