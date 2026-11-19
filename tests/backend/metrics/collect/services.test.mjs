import { expect, jest, test } from "@jest/globals";
import { EventEmitter } from "node:events";
import collectServiceMetric from "../../../../src/backend/metrics/collect/services.mjs";

test("collects HAProxy stats through the injected socket reader", async () => {
  const socket = jest
    .fn()
    .mockResolvedValue(
      "# pxname,svname,status,scur,stot,bin,bout,econ,eresp\nweb,BACKEND,UP,0,1,2,3,0,0\n",
    );
  await expect(
    collectServiceMetric({ type: "haproxy", socketPath: "/run/haproxy.sock" }, { socket }),
  ).resolves.toMatchObject({ totals: { backends: 1 } });
  expect(socket).toHaveBeenCalledWith("/run/haproxy.sock", 10_000);
});

test("collects HAProxy stats through an injected connection", async () => {
  const response =
    "# pxname,svname,status,scur,stot,bin,bout,econ,eresp\nweb,BACKEND,UP,0,1,2,3,0,0\n";
  const socket = new EventEmitter();
  socket.setEncoding = jest.fn();
  socket.end = jest.fn(() => {
    socket.emit("data", response);
    socket.emit("end");
  });
  socket.destroy = jest.fn();
  const connect = jest.fn(() => socket);
  const result = collectServiceMetric(
    { type: "haproxy", socketPath: "/run/haproxy.sock" },
    { connect },
  );
  socket.emit("connect");
  await expect(result).resolves.toMatchObject({ totals: { backends: 1 } });
});

test("collects DHCP lease files", async () => {
  const readFile = jest.fn(async () => "");
  await expect(
    collectServiceMetric({ type: "dhcp-leases", path: "/leases", format: "dnsmasq" }, { readFile }),
  ).resolves.toEqual({ totals: { activeLeases: 0 } });
  expect(readFile.mock.calls.map(([path, encoding]) => [path, encoding])).toEqual([
    ["/leases", "utf8"],
  ]);
});

test("rejects unsupported service metric types", async () => {
  await expect(collectServiceMetric({ type: "unknown" })).rejects.toThrow(
    "Unsupported service metric type",
  );
});

test("collects NTP tracking through the command adapter", async () => {
  const run = jest.fn().mockResolvedValue({ stdout: "Leap status : Normal\n" });
  await expect(collectServiceMetric({ type: "ntp" }, { run })).resolves.toMatchObject({
    synchronized: true,
  });
  expect(run).toHaveBeenCalledWith("chronyc", ["-n", "tracking"], { timeout: 10_000 });
});
