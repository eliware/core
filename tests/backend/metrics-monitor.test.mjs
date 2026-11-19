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
  const collect = jest.fn(async ({ type }) => {
    if (type === "dns-cache") return { totals: { rrsets: 3 } };
    if (type === "ntp") return { synchronized: false };
    if (type === "dhcp-leases") throw new Error("source unavailable");
    if (type === "haproxy") return { totals: { down: 0 }, backends: [{ state: "UP" }] };
    if (type === "arp") return { totals: { neighbors: 0, reachable: 0, failed: 0 }, neighbors: [] };
    if (type === "frr") return { totals: { peers: 0, established: 0, down: 0, routes: 0 } };
    if (type === "vrrp") return { totals: { instances: 0, master: 0, backup: 0, fault: 0 } };
    if (type === "routes") return { totals: { routes: 0, defaultRoutes: 0 } };
    return { totals: { interfaces: 0, up: 0 } };
  });
  const monitor = createMetricsMonitor({
    catalog,
    collect,
    now: () => new Date("2026-11-19T12:00:00.000Z"),
  });
  expect(monitor.getStatus().checkedAt).toBeNull();
  expect(monitor.getStatus().components.map(({ type, status }) => [type, status])).toEqual([
    ["interfaces", "unknown"],
    ["routes", "unknown"],
    ["arp", "unknown"],
    ["frr", "unknown"],
    ["vrrp", "unknown"],
    ["dns-cache", "unknown"],
    ["ntp", "unknown"],
    ["dhcp-leases", "unknown"],
    ["haproxy", "unknown"],
  ]);
  const result = await monitor.check();
  expect(result).toMatchObject({
    checkedAt: "2026-11-19T12:00:00.000Z",
    components: expect.arrayContaining([
      {
        id: "dns",
        status: "healthy",
        values: { totals: { rrsets: 3 } },
        name: "DNS",
        type: "dns-cache",
        checkedAt: "2026-11-19T12:00:00.000Z",
        detail: null,
      },
      {
        id: "ntp",
        status: "unhealthy",
        detail: "The component reports an unhealthy state",
        values: { synchronized: false },
        name: "NTP",
        type: "ntp",
        checkedAt: "2026-11-19T12:00:00.000Z",
      },
      {
        id: "dhcp",
        status: "unavailable",
        detail: "source unavailable",
        values: null,
        name: "DHCP",
        type: "dhcp-leases",
        checkedAt: "2026-11-19T12:00:00.000Z",
      },
      {
        id: "proxy",
        status: "healthy",
        values: { totals: { down: 0 }, backends: [{ state: "UP" }] },
        name: "Proxy",
        type: "haproxy",
        checkedAt: "2026-11-19T12:00:00.000Z",
        detail: null,
      },
    ]),
  });
  result.components.find(({ type }) => type === "dns-cache").values.totals.rrsets = 99;
  expect(
    monitor.getStatus().components.find(({ type }) => type === "dns-cache").values.totals.rrsets,
  ).toBe(3);
  expect(collect).toHaveBeenCalledTimes(9);
});

test("uses a generic detail when a metric collector throws a non-error value", async () => {
  const monitor = createMetricsMonitor({
    catalog: { components: [{ id: "ntp", name: "NTP", metrics: [{ type: "ntp" }] }] },
    collect: jest.fn().mockRejectedValue("offline"),
  });
  const result = await monitor.check();
  expect(result.components.find(({ type }) => type === "ntp")).toMatchObject({
    status: "unavailable",
    detail: "Metric check failed",
    values: null,
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
  const result = await monitor.check();
  expect(result.components.find(({ id }) => id === "proxy").status).toBe("unhealthy");
});

test.each([
  ["frr", { totals: { down: 1 } }],
  ["arp", { totals: { failed: 1 } }],
  ["vrrp", { totals: { fault: 1 } }],
  ["haproxy", { totals: { down: 0 }, backends: [{ state: "DOWN" }] }],
  ["haproxy", { totals: { down: 0 }, backends: [{}] }],
])("marks unhealthy %s state", async (type, values) => {
  const monitor = createMetricsMonitor({
    catalog: {
      components: [
        {
          id: type,
          name: type,
          metrics: [{ type, ...(type === "haproxy" ? { socketPath: "/run/haproxy.sock" } : {}) }],
        },
      ],
    },
    collect: jest.fn().mockResolvedValue(values),
  });
  const result = await monitor.check();
  expect(result.components.find((item) => item.type === type).status).toBe("unhealthy");
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
  expect(collect).toHaveBeenCalledTimes(7);
  expect(monitor.getStatus().components[0].status).toBe("healthy");
  expect(tick).toBeDefined();
  await monitor.stop();
  expect(clearIntervalFn).toHaveBeenCalledTimes(1);
});

test("collects built-in router views without a catalog and skips duplicate timers", async () => {
  let tick;
  const setIntervalFn = jest.fn((callback) => {
    tick = callback;
    return 1;
  });
  const clearIntervalFn = jest.fn();
  const monitor = createMetricsMonitor({ setIntervalFn, clearIntervalFn });
  expect(monitor.getStatus().components.map(({ type }) => type)).toEqual([
    "interfaces",
    "routes",
    "arp",
    "frr",
    "vrrp",
  ]);
  await monitor.stop();
  monitor.start();
  monitor.start();
  expect(setIntervalFn).toHaveBeenCalledTimes(1);
  expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 300_000);
  tick();
  await monitor.check();
  await monitor.stop();
  expect(clearIntervalFn).toHaveBeenCalledWith(1);
  expect(monitor.getStatus().components).toHaveLength(5);
});

test("uses default monitor settings", async () => {
  const monitor = createMetricsMonitor();
  await expect(monitor.check()).resolves.toMatchObject({ checkedAt: expect.any(String) });
  expect(monitor.getStatus().components).toHaveLength(5);
});
