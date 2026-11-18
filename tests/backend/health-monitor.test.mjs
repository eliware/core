import { expect, jest, test } from "@jest/globals";

const defaultExecFile = jest.fn((_command, _args, ...rest) => {
  const callback = rest.at(-1);
  callback(null, { stdout: "active" }, { stderr: "" });
});
jest.unstable_mockModule("node:child_process", () => ({ execFile: defaultExecFile }));
const createHealthMonitor = (await import("../../src/backend/health-monitor.mjs")).default;

test("checks configured units and reports unhealthy results", async () => {
  const checkUnit = jest.fn(async (unit) => {
    if (unit === "frr.service") throw new Error("inactive");
  });
  const onUnhealthy = jest.fn();
  const monitor = createHealthMonitor({
    units: ["sshd.service", "frr.service"],
    checkUnit,
    onUnhealthy,
    now: () => new Date("2026-11-18T12:00:00.000Z"),
  });
  await expect(monitor.check()).resolves.toEqual({
    status: "unhealthy",
    checkedAt: "2026-11-18T12:00:00.000Z",
    units: [
      { name: "sshd.service", status: "healthy", checkedAt: "2026-11-18T12:00:00.000Z" },
      {
        name: "frr.service",
        status: "unhealthy",
        checkedAt: "2026-11-18T12:00:00.000Z",
        detail: "Unit is not active",
      },
    ],
  });
  expect(checkUnit).toHaveBeenCalledTimes(2);
  expect(onUnhealthy).toHaveBeenCalledWith(expect.objectContaining({ name: "frr.service" }));
});

test("reports systemctl as unavailable when the command is missing", async () => {
  const monitor = createHealthMonitor({
    units: ["frr.service"],
    checkUnit: async () => {
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    },
  });
  await monitor.check();
  expect(monitor.getStatus().units[0].detail).toBe("systemctl is unavailable");
});

test("keeps health checks successful when an unhealthy callback rejects", async () => {
  const monitor = createHealthMonitor({
    units: ["frr.service"],
    checkUnit: async () => {
      throw new Error("inactive");
    },
    onUnhealthy: async () => {
      throw new Error("notification failed");
    },
  });
  await expect(monitor.check()).resolves.toMatchObject({ status: "unhealthy" });
});

test("reports an unconfigured state and manages one polling timer", () => {
  const timer = { unref: jest.fn() };
  const setIntervalFn = jest.fn(() => timer);
  const monitor = createHealthMonitor({ setIntervalFn });
  expect(monitor.getStatus()).toEqual({ status: "unconfigured", checkedAt: null, units: [] });
  monitor.start();
  monitor.start();
  expect(setIntervalFn).toHaveBeenCalledTimes(1);
  expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 300_000);
  expect(timer.unref).toHaveBeenCalledTimes(1);
  monitor.stop();
  expect(monitor.getStatus().status).toBe("unconfigured");
});

test("reports unknown health until configured units pass", () => {
  const monitor = createHealthMonitor({ units: ["frr.service"] });
  expect(monitor.getStatus().status).toBe("unknown");
  monitor.stop();
});

test("uses the default systemd command and clock", async () => {
  jest.useFakeTimers({ now: new Date("2026-11-18T12:00:00.000Z") });
  const monitor = createHealthMonitor({ units: ["frr.service"] });
  await monitor.check();
  expect(defaultExecFile).toHaveBeenCalledWith(
    "systemctl",
    ["is-active", "--quiet", "frr.service"],
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
  monitor.stop();
  monitor.stop();
});

test("accepts an omitted health monitor configuration", () => {
  expect(createHealthMonitor().getStatus()).toEqual({
    status: "unconfigured",
    checkedAt: null,
    units: [],
  });
});
