import { expect, jest, test } from "@jest/globals";
import { EventEmitter } from "node:events";
import collectMetric from "../../../src/backend/metrics/collect.mjs";

test("collects interface, HAProxy, lease, DNS, and NTP metrics from local sources", async () => {
  const run = jest.fn(async (command) => ({
    stdout: command === "ip" ? '[{"ifname":"eth0","operstate":"UP"}]' : "Leap status : Normal\n",
  }));
  const readFile = jest.fn(async (path) =>
    path === "/leases" ? "" : "++ Cache DB RRsets ++\nA: 2\n++ Resolver ++\n",
  );
  const socket = jest
    .fn()
    .mockResolvedValue(
      "# pxname,svname,status,scur,stot,bin,bout,econ,eresp\nweb,BACKEND,UP,0,1,2,3,0,0\n",
    );
  await expect(collectMetric({ type: "interfaces" }, { run })).resolves.toMatchObject({
    totals: { interfaces: 1, up: 1 },
  });
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
  expect(run.mock.calls.map(([command]) => command)).toEqual(["ip", "chronyc"]);
  expect(socket).toHaveBeenCalledWith("/run/haproxy.sock", 10_000);
  expect(readFile.mock.calls.map(([path]) => path)).toEqual(["/leases", "/stats"]);
  await expect(collectMetric({ type: "unknown" })).rejects.toThrow("Unsupported metric type");
});

test("reads a HAProxy Unix socket and reports socket errors and timeouts", async () => {
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

  const failedSocket = new EventEmitter();
  failedSocket.setEncoding = jest.fn();
  failedSocket.destroy = (error) => failedSocket.emit("error", error);
  const failed = collectMetric(
    { type: "haproxy", socketPath: "/missing.sock" },
    { connect: () => failedSocket },
  );
  failedSocket.emit("error", new Error("socket unavailable"));
  await expect(failed).rejects.toThrow("socket unavailable");

  await expect(
    collectMetric(
      { type: "haproxy", socketPath: "/stalled.sock" },
      {
        connect: () => {
          const stalled = new EventEmitter();
          stalled.setEncoding = jest.fn();
          stalled.destroy = (error) => stalled.emit("error", error);
          return stalled;
        },
        timeoutMs: 1,
      },
    ),
  ).rejects.toThrow("timed out");
});

test("reports a missing default HAProxy socket", async () => {
  await expect(collectMetric({ type: "haproxy", socketPath: "" })).rejects.toThrow();
});
