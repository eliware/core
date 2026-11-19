import { expect, jest, test } from "@jest/globals";
import collectRouterMetric from "../../../../src/backend/metrics/collect/router.mjs";

const metricRun = jest.fn(async (command, args) => {
  if (command === "ip" && args.includes("address"))
    return { stdout: '[{"ifname":"eth0","operstate":"UP","addr_info":[]}]' };
  if (command === "ip" && args.includes("route"))
    return { stdout: '[{"dst":"default","gateway":"10.0.0.1"}]' };
  if (command === "ip") return { stdout: '[{"dst":"10.0.0.1","state":["REACHABLE"]}]' };
  return {
    stdout: args[1].includes("summary")
      ? '{"ipv4Unicast":{"peers":{"10.0.0.2":{"state":"Established"}}}}'
      : '{"10.0.0.0/24":[{"protocol":"bgp"}]}',
  };
});

test("collects interface, route, neighbor, and FRR metrics", async () => {
  await expect(
    collectRouterMetric({ type: "interfaces" }, { run: metricRun }),
  ).resolves.toMatchObject({
    totals: { interfaces: 1, up: 1 },
  });
  await expect(collectRouterMetric({ type: "routes" }, { run: metricRun })).resolves.toMatchObject({
    totals: { routes: 1, defaultRoutes: 1 },
  });
  await expect(collectRouterMetric({ type: "arp" }, { run: metricRun })).resolves.toMatchObject({
    totals: { neighbors: 1, reachable: 1 },
  });
  await expect(collectRouterMetric({ type: "frr" }, { run: metricRun })).resolves.toMatchObject({
    totals: { peers: 1, established: 1, routes: 1 },
  });
  expect(metricRun.mock.calls.map(([command]) => command)).toEqual([
    "ip",
    "ip",
    "ip",
    "vtysh",
    "vtysh",
  ]);
});

test("collects VRRP state from Keepalived", async () => {
  const readFile = jest.fn(async (path) =>
    path === "/pid" ? "1234" : '{"v1":[{"data":{"iname":"VI_LAN","state":2}}]}',
  );
  const signalProcess = jest.fn();
  const wait = jest.fn().mockResolvedValue(undefined);
  await expect(
    collectRouterMetric(
      { type: "vrrp", pidPath: "/pid", path: "/vrrp.json" },
      { readFile, signalProcess, vrrpDelayMs: 25, wait },
    ),
  ).resolves.toMatchObject({ totals: { instances: 1, master: 1 } });
  expect(signalProcess).toHaveBeenCalledWith(1234, "SIGUSR1");
  expect(wait).toHaveBeenCalledWith(25);
  expect(readFile.mock.calls.map(([path]) => path)).toEqual(["/pid", "/vrrp.json"]);
});

test("uses the configured VRRP snapshot when signaling is unavailable", async () => {
  const readFile = jest.fn(async (path) =>
    path === "/pid" ? "1234" : '{"v1":[{"data":{"iname":"VI_LAN","state":2}}]}',
  );
  const signalProcess = jest.fn(() => {
    throw new Error("permission denied");
  });
  const wait = jest.fn();
  await expect(
    collectRouterMetric(
      { type: "vrrp", pidPath: "/pid", path: "/vrrp.json" },
      { readFile, signalProcess, wait },
    ),
  ).resolves.toMatchObject({ totals: { instances: 1, master: 1 } });
  expect(signalProcess).toHaveBeenCalledWith(1234, "SIGUSR1");
  expect(wait).not.toHaveBeenCalled();
  expect(readFile).toHaveBeenLastCalledWith("/vrrp.json", "utf8");
});

test("rejects unknown metrics", async () => {
  await expect(collectRouterMetric({ type: "unknown" })).rejects.toThrow("Unsupported metric type");
});

test("uses the default delay while collecting VRRP state", async () => {
  await expect(
    collectRouterMetric(
      { type: "vrrp", pidPath: "/pid", path: "/vrrp.json" },
      {
        readFile: async (path) =>
          path === "/pid" ? "1234" : '{"v1":[{"data":{"iname":"VI_LAN","state":2}}]}',
        signalProcess: jest.fn(),
        vrrpDelayMs: 0,
      },
    ),
  ).resolves.toMatchObject({ totals: { instances: 1, master: 1 } });
});
