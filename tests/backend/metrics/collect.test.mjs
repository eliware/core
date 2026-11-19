import { expect, jest, test } from "@jest/globals";
import { EventEmitter } from "node:events";
import collectMetric from "../../../src/backend/metrics/collect.mjs";

test("collects router metrics from local command, socket, and file sources", async () => {
  const run = jest.fn(async (command, args) => {
    if (command === "ip" && args.includes("address"))
      return { stdout: '[{"ifname":"eth0","operstate":"UP","addr_info":[]}]' };
    if (command === "ip" && args.includes("route"))
      return { stdout: '[{"dst":"default","gateway":"10.0.0.1"}]' };
    if (command === "ip") return { stdout: '[{"dst":"10.0.0.1","state":["REACHABLE"]}]' };
    if (command === "vtysh")
      return {
        stdout: args[1].includes("summary")
          ? '{"ipv4Unicast":{"peers":{"10.0.0.2":{"state":"Established"}}}}'
          : '{"10.0.0.0/24":[{"protocol":"bgp"}]}',
      };
    return { stdout: "Leap status : Normal\n" };
  });
  const readFile = jest.fn(async (path) => {
    if (path === "/leases") return "";
    if (path === "/pid" || path.endsWith("keepalived_vrrp.pid")) return "1234";
    if (path === "/vrrp.json" || path.endsWith("keepalived.json"))
      return '{"v1":[{"data":{"iname":"VI_LAN","state":2}}]}';
    return "++ Cache DB RRsets ++\nA: 2\n++ Resolver ++\n";
  });
  const socket = jest
    .fn()
    .mockResolvedValue(
      "# pxname,svname,status,scur,stot,bin,bout,econ,eresp\nweb,BACKEND,UP,0,1,2,3,0,0\n",
    );
  await expect(collectMetric({ type: "interfaces" }, { run })).resolves.toMatchObject({
    totals: { interfaces: 1, up: 1 },
  });
  await expect(collectMetric({ type: "routes" }, { run })).resolves.toMatchObject({
    totals: { routes: 1, defaultRoutes: 1 },
  });
  await expect(collectMetric({ type: "arp" }, { run })).resolves.toMatchObject({
    totals: { neighbors: 1, reachable: 1 },
  });
  await expect(collectMetric({ type: "frr" }, { run })).resolves.toMatchObject({
    totals: { peers: 1, established: 1, routes: 1 },
  });
  await expect(
    collectMetric(
      { type: "vrrp", pidPath: "/pid", path: "/vrrp.json" },
      { readFile, signalProcess: jest.fn(), vrrpDelayMs: 0 },
    ),
  ).resolves.toMatchObject({ totals: { instances: 1, master: 1 } });
  await expect(
    collectMetric({ type: "haproxy", socketPath: "/run/haproxy.sock" }, { socket }),
  ).resolves.toMatchObject({ totals: { backends: 1 } });
  await expect(
    collectMetric({ type: "dhcp-leases", path: "/leases", format: "dnsmasq" }, { readFile }),
  ).resolves.toEqual({ totals: { activeLeases: 0 } });
  await expect(collectMetric({ type: "dns-cache", path: "/stats" }, { readFile })).resolves.toEqual(
    { totals: { rrsets: 2 }, records: { A: 2 } },
  );
  await expect(collectMetric({ type: "ntp" }, { run })).resolves.toMatchObject({
    synchronized: true,
  });
  expect(run.mock.calls.map(([command]) => command)).toEqual([
    "ip",
    "ip",
    "ip",
    "vtysh",
    "vtysh",
    "chronyc",
  ]);
  expect(socket).toHaveBeenCalledWith("/run/haproxy.sock", 10_000);
  expect(readFile.mock.calls.map(([path]) => path)).toEqual([
    "/pid",
    "/vrrp.json",
    "/leases",
    "/stats",
  ]);
  await expect(collectMetric({ type: "unknown" })).rejects.toThrow("Unsupported metric type");
});

test("uses the process signal adapter for Keepalived status", async () => {
  const originalKill = process.kill;
  const signal = jest.fn();
  process.kill = signal;
  try {
    await collectMetric(
      { type: "vrrp" },
      {
        readFile: async (path) =>
          path.endsWith(".pid") ? "1234" : '{"v1":[{"data":{"iname":"VI_LAN","state":2}}]}',
        vrrpDelayMs: 0,
      },
    );
    expect(signal).toHaveBeenCalledWith(1234, "SIGUSR1");
  } finally {
    process.kill = originalKill;
  }
});

test("rejects an invalid Keepalived process identifier", async () => {
  await expect(
    collectMetric(
      { type: "vrrp", pidPath: "/pid" },
      { readFile: async () => "0", signalProcess: jest.fn() },
    ),
  ).rejects.toThrow("Keepalived VRRP process ID is invalid");
});

test("uses the socket reader when a connection adapter is provided", async () => {
  const response =
    "# pxname,svname,status,scur,stot,bin,bout,econ,eresp\nweb,BACKEND,UP,0,1,2,3,0,0\n";
  const socket = new EventEmitter();
  socket.setEncoding = jest.fn();
  socket.end = jest.fn(() => {
    socket.emit("data", response);
    socket.emit("end");
    socket.emit("close");
  });
  socket.destroy = jest.fn();
  const connect = jest.fn(() => socket);
  const result = collectMetric({ type: "haproxy", socketPath: "/run/haproxy.sock" }, { connect });
  socket.emit("connect");
  await expect(result).resolves.toMatchObject({ totals: { backends: 1 } });
  expect(socket.end).toHaveBeenCalledWith("show stat\n");
});

test("reports a missing default HAProxy socket", async () => {
  await expect(collectMetric({ type: "haproxy", socketPath: "" })).rejects.toThrow();
});
