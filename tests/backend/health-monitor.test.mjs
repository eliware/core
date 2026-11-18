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

test("updates unit health when the clock fails", async () => {
  const monitor = createHealthMonitor({
    units: ["frr.service"],
    checkUnit: async () => {},
    now: () => {
      throw new Error("clock unavailable");
    },
  });
  await expect(monitor.check()).resolves.toEqual({
    status: "healthy",
    checkedAt: null,
    units: [{ name: "frr.service", status: "healthy", checkedAt: null }],
  });
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

test("reports an unconfigured state and manages one polling timer", async () => {
  const timer = { unref: jest.fn() };
  const setIntervalFn = jest.fn(() => timer);
  const monitor = createHealthMonitor({ setIntervalFn });
  expect(monitor.getStatus()).toEqual({ status: "unconfigured", checkedAt: null, units: [] });
  monitor.start();
  monitor.start();
  expect(setIntervalFn).toHaveBeenCalledTimes(1);
  expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 300_000);
  expect(timer.unref).toHaveBeenCalledTimes(1);
  await monitor.stop();
  expect(monitor.getStatus().status).toBe("unconfigured");
});

test("reports unknown health until configured units pass", async () => {
  const monitor = createHealthMonitor({ units: ["frr.service"] });
  expect(monitor.getStatus().status).toBe("unknown");
  await monitor.stop();
});

test("records and reports a health check setup failure", async () => {
  const units = ["frr.service"];
  let mapCalls = 0;
  units.map = (callback) => {
    mapCalls += 1;
    if (mapCalls > 1) throw new Error("check setup failed");
    return Array.prototype.map.call(units, callback);
  };
  const onUnhealthy = jest.fn();
  const monitor = createHealthMonitor({
    units,
    onUnhealthy,
    setIntervalFn: () => 1,
  });

  monitor.start();
  await Promise.resolve();
  await Promise.resolve();

  expect(monitor.getStatus()).toMatchObject({
    status: "unhealthy",
    units: [{ name: "frr.service", status: "unhealthy", detail: "Health check could not start" }],
  });
  expect(onUnhealthy).toHaveBeenCalledWith(monitor.getStatus().units[0]);
  await monitor.stop();
});

test("ignores setup failures after the monitor stops", async () => {
  const units = ["frr.service"];
  let mapCalls = 0;
  units.map = (callback) => {
    mapCalls += 1;
    if (mapCalls > 1) throw new Error("check setup failed");
    return Array.prototype.map.call(units, callback);
  };
  const monitor = createHealthMonitor({ units, setIntervalFn: () => 1 });
  monitor.start();
  await monitor.stop();
  await Promise.resolve();
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
    checkUnit: async () => {
      throw new Error("inactive");
    },
    onUnhealthy,
  });
  const result = await monitor.check();
  expect(finishStop).toBe(true);
  expect(result.status).toBe("unhealthy");
  expect(onUnhealthy).toHaveBeenCalledTimes(1);
});

test("ignores scheduled callbacks after shutdown", async () => {
  let scheduledCheck;
  const setIntervalFn = (callback) => {
    scheduledCheck = callback;
    return { unref: jest.fn() };
  };
  const checkUnit = jest.fn();
  const monitor = createHealthMonitor({ units: ["frr.service"], checkUnit, setIntervalFn });
  monitor.start();
  await monitor.stop();
  scheduledCheck();
  await Promise.resolve();
  expect(checkUnit).toHaveBeenCalledTimes(1);
});

test("contains notification failures while reporting setup failures", async () => {
  const units = ["frr.service"];
  let mapCalls = 0;
  units.map = (callback) => {
    mapCalls += 1;
    if (mapCalls > 1) throw new Error("check setup failed");
    return Array.prototype.map.call(units, callback);
  };
  const monitor = createHealthMonitor({
    units,
    onUnhealthy: async () => {
      throw new Error("notification failed");
    },
    setIntervalFn: () => 1,
  });
  monitor.start();
  await Promise.resolve();
  await Promise.resolve();
  await monitor.stop();
  expect(monitor.getStatus().status).toBe("unhealthy");
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
  const stopped = monitor.stop();
  finishCheck(new Error("inactive"));
  await stopped;

  expect(monitor.getStatus()).toMatchObject({
    status: "unknown",
    units: [{ name: "frr.service", status: "unknown" }],
  });
  expect(onUnhealthy).not.toHaveBeenCalled();
});

test("accepts an omitted health monitor configuration", () => {
  expect(createHealthMonitor().getStatus()).toEqual({
    status: "unconfigured",
    checkedAt: null,
    units: [],
  });
});
