import { expect, jest, test } from "@jest/globals";
import createMetricsMonitor from "../../src/backend/metrics-monitor.mjs";

const catalog = {
  components: [
    { id: "dns", name: "DNS", metrics: [{ type: "dns-cache" }] },
    { id: "ntp", name: "NTP", metrics: [{ type: "ntp" }] },
    { id: "dhcp", name: "DHCP", metrics: [{ type: "dhcp-leases" }] },
    { id: "proxy", name: "Proxy", metrics: [{ type: "haproxy", socketPath: "/run/haproxy.sock" }] },
    { id: "empty", name: "No metrics" },
  ],
};

test("keeps only the latest in-memory metrics and exposes missing sources", async () => {
  const collect = jest
    .fn()
    .mockResolvedValueOnce({ totals: { rrsets: 3 } })
    .mockResolvedValueOnce({ synchronized: false })
    .mockRejectedValueOnce(new Error("source unavailable"))
    .mockResolvedValueOnce({ totals: { down: 0 }, backends: [{}] });
  const monitor = createMetricsMonitor({
    catalog,
    collect,
    now: () => new Date("2026-11-19T12:00:00.000Z"),
  });
  expect(monitor.getStatus()).toEqual({
    checkedAt: null,
    components: [
      {
        id: "dns",
        name: "DNS",
        type: "dns-cache",
        status: "unknown",
        checkedAt: null,
        detail: "Waiting for first check",
        values: null,
      },
      {
        id: "ntp",
        name: "NTP",
        type: "ntp",
        status: "unknown",
        checkedAt: null,
        detail: "Waiting for first check",
        values: null,
      },
      {
        id: "dhcp",
        name: "DHCP",
        type: "dhcp-leases",
        status: "unknown",
        checkedAt: null,
        detail: "Waiting for first check",
        values: null,
      },
      {
        id: "proxy",
        name: "Proxy",
        type: "haproxy",
        status: "unknown",
        checkedAt: null,
        detail: "Waiting for first check",
        values: null,
      },
    ],
  });
  const result = await monitor.check();
  expect(result).toMatchObject({
    checkedAt: "2026-11-19T12:00:00.000Z",
    components: [
      { id: "dns", status: "healthy", values: { totals: { rrsets: 3 } } },
      {
        id: "ntp",
        status: "unhealthy",
        detail: "The component reports an unhealthy state",
        values: { synchronized: false },
      },
      { id: "dhcp", status: "unavailable", detail: "source unavailable", values: null },
      {
        id: "proxy",
        status: "unhealthy",
        detail: "The component reports an unhealthy state",
        values: { totals: { down: 0 }, backends: [{}] },
      },
    ],
  });
  result.components[0].values.totals.rrsets = 99;
  expect(monitor.getStatus().components[0].values.totals.rrsets).toBe(3);
  expect(collect).toHaveBeenCalledTimes(4);
});

test("uses a generic detail when a metric collector throws a non-error value", async () => {
  const monitor = createMetricsMonitor({
    catalog: { components: [{ id: "ntp", name: "NTP", metrics: [{ type: "ntp" }] }] },
    collect: jest.fn().mockRejectedValue("offline"),
  });
  await expect(monitor.check()).resolves.toMatchObject({
    components: [{ status: "unavailable", detail: "Metric check failed", values: null }],
  });
});

test("marks HAProxy metrics unhealthy when any server is down", async () => {
  const monitor = createMetricsMonitor({
    catalog: {
      components: [
        {
          id: "proxy",
          name: "Proxy",
          metrics: [{ type: "haproxy", socketPath: "/run/haproxy.sock" }],
        },
      ],
    },
    collect: jest.fn().mockResolvedValue({ totals: { down: 1 }, backends: [{ state: "UP" }] }),
  });
  await expect(monitor.check()).resolves.toMatchObject({ components: [{ status: "unhealthy" }] });
});

test("runs an initial check, refreshes on its interval, and stops the timer", async () => {
  let tick;
  const clearIntervalFn = jest.fn();
  const collect = jest.fn(async (metric) =>
    metric.type === "haproxy"
      ? { totals: { down: 0 }, backends: [{ state: "UP" }] }
      : { totals: { active: 1 } },
  );
  const monitor = createMetricsMonitor({
    catalog: {
      components: [
        {
          id: "dhcp",
          name: "DHCP",
          metrics: [{ type: "dhcp-leases" }, { type: "haproxy", socketPath: "/run/haproxy.sock" }],
        },
      ],
    },
    collect,
    setIntervalFn: jest.fn((callback, delay) => {
      tick = callback;
      return { unref: jest.fn(), delay };
    }),
    clearIntervalFn,
  });
  monitor.start();
  await monitor.check();
  expect(collect).toHaveBeenCalledTimes(2);
  expect(monitor.getStatus().components[0].status).toBe("healthy");
  expect(tick).toBeDefined();
  await monitor.stop();
  expect(clearIntervalFn).toHaveBeenCalledTimes(1);
});

test("handles an empty catalog, skips duplicate timers, and stops without an active timer", async () => {
  let tick;
  const setIntervalFn = jest.fn((callback) => {
    tick = callback;
    return 1;
  });
  const clearIntervalFn = jest.fn();
  const monitor = createMetricsMonitor({ setIntervalFn, clearIntervalFn });
  expect(monitor.getStatus()).toEqual({ checkedAt: null, components: [] });
  await monitor.stop();
  monitor.start();
  monitor.start();
  expect(setIntervalFn).toHaveBeenCalledTimes(1);
  expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 300_000);
  tick();
  await monitor.check();
  await monitor.stop();
  expect(clearIntervalFn).toHaveBeenCalledWith(1);
  expect(monitor.getStatus().components).toEqual([]);
});

test("uses default monitor settings", async () => {
  const monitor = createMetricsMonitor();
  await expect(monitor.check()).resolves.toEqual({ checkedAt: expect.any(String), components: [] });
  expect(monitor.getStatus().components).toEqual([]);
});
