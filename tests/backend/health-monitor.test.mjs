import { expect, jest, test } from "@jest/globals";
import { createHealthMonitor } from "../../test-fixtures/health-monitor-tests.mjs";

test("records systemd events after an active health check", async () => {
  let finishCheck;
  let checkStarted;
  const started = new Promise((resolve) => {
    checkStarted = resolve;
  });
  const onSystemdEvent = jest.fn().mockRejectedValue(new Error("offline"));
  const monitor = createHealthMonitor({
    units: ["frr.service"],
    checkUnit: () =>
      new Promise((resolve) => {
        finishCheck = resolve;
        checkStarted();
      }),
    onSystemdEvent,
  });
  monitor.start();
  await started;
  const event = {
    name: "frr.service",
    event: "failed",
    status: "unhealthy",
    state: "failed",
    checkedAt: "2026-11-19T12:00:00.000Z",
  };
  const recorded = monitor.recordEvent(event);
  finishCheck();
  await recorded;
  await monitor.recordEvent(event);
  expect(monitor.getStatus().units[0]).toMatchObject({ status: "unhealthy", state: "failed" });
  expect(onSystemdEvent).toHaveBeenCalledTimes(1);
  await monitor.stop();
  await expect(monitor.recordEvent({ ...event, name: "missing.service" })).resolves.toBeUndefined();
});
