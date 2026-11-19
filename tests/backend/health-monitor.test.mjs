import { expect, jest, test } from "@jest/globals";
import * as healthMonitorHelpers from "../../test-fixtures/health-monitor.mjs";
const { createHealthMonitor, defaultExecFile, deferred } = healthMonitorHelpers;
test("records systemd events after an active health check", async () => {
  let finishCheck;
  const started = deferred();
  const onSystemdEvent = jest.fn().mockRejectedValue(new Error("offline"));
  const monitor = createHealthMonitor({
    units: ["frr.service"],
    checkUnit: () =>
      new Promise((resolve) => {
        finishCheck = resolve;
        started.resolve();
      }),
    onSystemdEvent,
  });
  monitor.start();
  await started.promise;
  const event = healthMonitorHelpers.systemdFailureEvent;
  const recorded = monitor.recordEvent(event);
  finishCheck();
  await recorded;
  await monitor.recordEvent(event);
  expect(monitor.getStatus().units[0]).toMatchObject({ status: "unhealthy", state: "failed" });
  expect(onSystemdEvent).toHaveBeenCalledTimes(1);
  await monitor.stop();
  await expect(monitor.recordEvent({ ...event, name: "missing.service" })).resolves.toBeUndefined();
});
test("checks configured units and reports unhealthy results", async () => {
  const checkUnit = jest.fn(
    async (unit) => unit === "frr.service" && healthMonitorHelpers.rejectInactive(),
  );
  const onUnhealthy = jest.fn().mockRejectedValue(new Error("notification failed"));
  let timestamp = 0;
  const monitor = createHealthMonitor({
    units: ["sshd.service", "frr.service"],
    checkUnit,
    onUnhealthy,
    now: () => new Date(Date.parse("2026-11-18T12:00:00.000Z") + timestamp++ * 1000),
  });
  await expect(monitor.check()).resolves.toEqual({
    status: "unhealthy",
    checkedAt: "2026-11-18T12:00:01.000Z",
    units: [
      { name: "sshd.service", status: "healthy", checkedAt: "2026-11-18T12:00:00.000Z" },
      {
        name: "frr.service",
        status: "unhealthy",
        checkedAt: "2026-11-18T12:00:01.000Z",
        detail: "Unit is not active",
      },
    ],
  });
  expect(checkUnit).toHaveBeenCalledTimes(2);
  expect(onUnhealthy).toHaveBeenCalledWith(expect.objectContaining({ name: "frr.service" }));
});
test("alerts once for one continuing unhealthy state", async () => {
  const onUnhealthy = jest.fn();
  const monitor = healthMonitorHelpers.createUnhealthyMonitor(onUnhealthy);
  await monitor.check();
  await monitor.check();
  expect(onUnhealthy).toHaveBeenCalledTimes(1);
});
test("keeps the monitor stopped when timer setup fails", async () => {
  const checkUnit = jest.fn();
  const setIntervalFn = jest.fn(() => {
    if (setIntervalFn.mock.calls.length === 1) throw new Error("timer setup failed");
    return { unref: jest.fn() };
  });
  const monitor = createHealthMonitor({ units: ["frr.service"], checkUnit, setIntervalFn });
  expect(() => monitor.start()).toThrow("timer setup failed");
  expect(monitor.getStatus().status).toBe("unknown");
  expect(checkUnit).not.toHaveBeenCalled();
  monitor.start();
  await monitor.check();
  expect(checkUnit).toHaveBeenCalledTimes(1);
  await monitor.stop();
});
test("reports systemctl as unavailable when the command is missing", async () => {
  const monitor = createHealthMonitor({
    units: ["frr.service"],
    checkUnit: healthMonitorHelpers.rejectUnavailableSystemctl,
  });
  await monitor.check();
  expect(monitor.getStatus().units[0].detail).toBe("systemctl is unavailable");
});
test("updates unit health when the clock fails", async () => {
  const monitor = createHealthMonitor({
    units: ["frr.service"],
    checkUnit: async () => {},
    now: healthMonitorHelpers.unavailableClock,
  });
  await expect(monitor.check()).resolves.toMatchObject({
    status: "healthy",
    checkedAt: null,
    units: [{ name: "frr.service", status: "healthy", checkedAt: null }],
  });
});
test("records and reports a health check setup failure", async () => {
  const units = healthMonitorHelpers.arrayThatFailsOnRepeatedAccess(
    ["frr.service"],
    "0",
    "unit lookup failed",
  );
  const onUnhealthy = jest.fn().mockRejectedValue(new Error("notification failed"));
  const monitor = createHealthMonitor({ units, onUnhealthy, setIntervalFn: () => 1 });
  monitor.start();
  await healthMonitorHelpers.flushMicrotasks();
  expect(monitor.getStatus()).toMatchObject({
    status: "unknown",
    units: [{ name: "frr.service", status: "unknown", detail: "Health check could not start" }],
  });
  expect(onUnhealthy).not.toHaveBeenCalled();
  await monitor.stop();
});
test("ignores a setup failure after shutdown starts", async () => {
  const setupUnits = healthMonitorHelpers.arrayThatFailsOnRepeatedAccess(
    ["frr.service"],
    "length",
    "setup failed",
  );
  const setupMonitor = createHealthMonitor({ units: setupUnits, setIntervalFn: () => 1 });
  setupMonitor.start();
  await healthMonitorHelpers.flushMicrotasks();
  expect(setupMonitor.getStatus().units[0].detail).toBe("Health check could not start");
  await setupMonitor.stop();
  const units = healthMonitorHelpers.arrayThatFailsOnRepeatedAccess(
    ["frr.service"],
    "length",
    "check setup failed",
  );
  const monitor = createHealthMonitor({ units, setIntervalFn: () => 1 });
  monitor.start();
  await expect(monitor.stop()).rejects.toThrow("check setup failed");
  expect(monitor.getStatus().status).toBe("unknown");
});
test("stops notifying when shutdown begins during an alert", async () => {
  let monitor;
  let finishStop;
  const onUnhealthy = jest.fn(async () => {
    await monitor.stop();
    finishStop = true;
  });
  monitor = createHealthMonitor({
    units: ["one.service", "two.service"],
    checkUnit: healthMonitorHelpers.rejectInactive,
    onUnhealthy,
  });
  const result = await monitor.check();
  expect(finishStop).toBe(true);
  expect(result.status).toBe("unhealthy");
  expect(onUnhealthy).toHaveBeenCalledTimes(1);
});
test("ignores scheduled callbacks after shutdown", async () => {
  let scheduledCheck;
  const timer = { id: "timer", unref: jest.fn() };
  const clearIntervalFn = jest.fn();
  const setIntervalFn = jest.fn((callback) => {
    scheduledCheck = callback;
    return timer;
  });
  const checkUnit = jest.fn();
  const monitor = createHealthMonitor({
    units: ["frr.service"],
    checkUnit,
    setIntervalFn,
    clearIntervalFn,
  });
  monitor.start();
  monitor.start();
  expect(setIntervalFn).toHaveBeenCalledTimes(1);
  expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 300_000);
  expect(timer.unref).toHaveBeenCalledTimes(1);
  await healthMonitorHelpers.flushMicrotasks(2);
  checkUnit.mockClear();
  await monitor.stop();
  scheduledCheck();
  await Promise.resolve();
  expect(clearIntervalFn).toHaveBeenCalledWith(timer);
  expect(checkUnit).not.toHaveBeenCalled();
});
test("uses the default systemd command and clock", async () => {
  jest.useFakeTimers({ now: new Date("2026-11-18T12:00:00.000Z") });
  const monitor = createHealthMonitor({ units: ["frr.service"] });
  await monitor.check();
  expect(defaultExecFile).toHaveBeenCalledWith(
    "systemctl",
    ["is-active", "--quiet", "frr.service"],
    { timeout: 10_000 },
    expect.any(Function),
  );
  expect(monitor.getStatus()).toMatchObject({
    status: "healthy",
    checkedAt: "2026-11-18T12:00:00.000Z",
  });
  jest.useRealTimers();
});
test("shares an active check and runs the scheduled check callback", async () => {
  let scheduledCheck;
  const setIntervalFn = jest.fn((callback) => {
    scheduledCheck = callback;
    return { unref: jest.fn() };
  });
  const checkUnit = jest.fn().mockResolvedValue(undefined);
  const monitor = createHealthMonitor({
    units: ["frr.service"],
    checkUnit,
    setIntervalFn,
    now: () => new Date("2026-11-18T12:00:00.000Z"),
  });
  monitor.start();
  const first = monitor.check();
  const second = monitor.check();
  await Promise.all([first, second]);
  expect(checkUnit).toHaveBeenCalledTimes(1);
  scheduledCheck();
  await Promise.resolve();
  await Promise.resolve();
  expect(checkUnit).toHaveBeenCalledTimes(2);
  await monitor.stop();
  await monitor.stop();
});
test("stops an active check before it updates health or sends an alert", async () => {
  let finishCheck;
  const onUnhealthy = jest.fn();
  const monitor = createHealthMonitor({
    units: ["frr.service"],
    checkUnit: () =>
      new Promise((resolve, reject) => {
        finishCheck = (error) => (error ? reject(error) : resolve());
      }),
    onUnhealthy,
    setIntervalFn: () => 1,
  });
  monitor.start();
  let stopResolved = false;
  const stopped = monitor.stop().then(() => {
    stopResolved = true;
  });
  await Promise.resolve();
  expect(stopResolved).toBe(false);
  finishCheck(new Error("inactive"));
  await stopped;
  expect(stopResolved).toBe(true);
  expect(monitor.getStatus()).toMatchObject({
    status: "unknown",
    units: [{ name: "frr.service", status: "unknown" }],
  });
  expect(onUnhealthy).not.toHaveBeenCalled();
});
test("waits for an old check before restarting the monitor", async () => {
  const finishChecks = [];
  let activeChecks = 0;
  let maximumActiveChecks = 0;
  const checkUnit = jest.fn(
    () =>
      new Promise((resolve) => {
        activeChecks += 1;
        maximumActiveChecks = Math.max(maximumActiveChecks, activeChecks);
        finishChecks.push(() => {
          activeChecks -= 1;
          resolve();
        });
      }),
  );
  const monitor = createHealthMonitor({
    units: ["frr.service"],
    checkUnit,
    setIntervalFn: () => ({ unref: jest.fn() }),
  });
  monitor.start();
  const stopped = monitor.stop();
  monitor.start();
  expect(checkUnit).toHaveBeenCalledTimes(1);
  finishChecks[0]();
  await stopped;
  for (let attempt = 0; attempt < 6 && checkUnit.mock.calls.length < 2; attempt += 1)
    await Promise.resolve();
  expect(checkUnit).toHaveBeenCalledTimes(2);
  expect(maximumActiveChecks).toBe(1);
  finishChecks[1]();
  await Promise.resolve();
  await monitor.stop();
});
test("uses default health monitor configuration and event handling", async () => {
  expect(createHealthMonitor().getStatus()).toEqual({
    status: "unconfigured",
    checkedAt: null,
    units: [],
  });
  const monitor = createHealthMonitor({
    units: ["frr.service"],
    checkUnit: async () => {},
    setIntervalFn: () => 1,
  });
  monitor.start();
  await monitor.check();
  await monitor.recordEvent({ name: "frr.service", event: "failed", status: "unhealthy" });
  await monitor.stop();
});
