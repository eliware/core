import { expect, jest, test } from "@jest/globals";
import collectVrrp from "../../../../src/backend/metrics/collect/vrrp.mjs";

const state = '{"v1":[{"data":{"iname":"VI_LAN","state":2}}]}';

test("signals Keepalived and collects its refreshed JSON state", async () => {
  const readFile = jest.fn(async (path) => (path === "/pid" ? "1234" : state));
  const signalProcess = jest.fn();
  const getJsonSignal = jest.fn().mockResolvedValue("36");
  const wait = jest.fn().mockResolvedValue(undefined);
  await expect(
    collectVrrp(
      { type: "vrrp", pidPath: "/pid", path: "/state" },
      {
        readFile,
        signalProcess,
        getJsonSignal,
        wait,
      },
    ),
  ).resolves.toMatchObject({ totals: { instances: 1, master: 1 } });
  expect(getJsonSignal).toHaveBeenCalledTimes(1);
  expect(signalProcess).toHaveBeenCalledWith(1234, 36);
  expect(wait).toHaveBeenCalledTimes(1);
  expect(readFile.mock.calls).toEqual([
    ["/pid", "utf8"],
    ["/state", "utf8"],
  ]);
});

test("uses default Keepalived paths", async () => {
  const readFile = jest.fn(async (path) => (path === "/run/keepalived.pid" ? "1" : state));
  await collectVrrp(
    { type: "vrrp" },
    {
      readFile,
      signalProcess: jest.fn(),
      getJsonSignal: async () => "36",
      wait: jest.fn(),
    },
  );
  expect(readFile.mock.calls).toEqual([
    ["/run/keepalived.pid", "utf8"],
    ["/tmp/keepalived.json", "utf8"],
  ]);
});

test("falls back to the configured state when Keepalived lacks JSON signals", async () => {
  const readFile = jest.fn(async (path) => (path === "/pid" ? "1234" : state));
  await expect(
    collectVrrp(
      { type: "vrrp", pidPath: "/pid", path: "/state" },
      {
        readFile,
        signalProcess: jest.fn(),
        getJsonSignal: async () => "unknown",
        wait: jest.fn(),
      },
    ),
  ).resolves.toMatchObject({ totals: { instances: 1, master: 1 } });
});

test("uses the configured state when the process ID is invalid", async () => {
  const signalProcess = jest.fn();
  await expect(
    collectVrrp(
      { pidPath: "/pid" },
      {
        readFile: async (path) => (path === "/pid" ? "0" : state),
        signalProcess,
        getJsonSignal: async () => "36",
        wait: jest.fn(),
      },
    ),
  ).resolves.toMatchObject({ totals: { instances: 1, master: 1 } });
  expect(signalProcess).not.toHaveBeenCalled();
});
