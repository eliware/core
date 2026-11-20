import { expect, jest, test } from "@jest/globals";

const defaultReadFile = jest.fn();
const defaultReadlink = jest.fn();
jest.unstable_mockModule("node:fs/promises", () => ({
  readFile: defaultReadFile,
  readlink: defaultReadlink,
}));
const { default: collectVrrpSnapshot } =
  await import("../../../../src/backend/metrics/collect/vrrp-snapshot.mjs");
const state = '{"v1":[{"data":{"iname":"VI_LAN","state":2}}]}';

test("signals Keepalived and reads its refreshed snapshot", async () => {
  const read = jest.fn(async (path) =>
    path === "/pid" ? "1234" : path === "/proc/1234/comm" ? "keepalived" : state,
  );
  const run = jest.fn().mockResolvedValue({ stdout: "36\n" });
  const signalProcess = jest.fn();
  const wait = jest.fn().mockResolvedValue(undefined);
  await expect(
    collectVrrpSnapshot(
      { pidPath: "/pid", path: "/state" },
      {
        readFile: read,
        readlink: async () => "/usr/sbin/keepalived",
        run,
        signalProcess,
        wait,
        vrrpDelayMs: 25,
        timeoutMs: 500,
      },
    ),
  ).resolves.toBe(state);
  expect(run).toHaveBeenCalledWith("/proc/1234/exe", ["--signum=JSON"], { timeout: 500 });
  expect(signalProcess).toHaveBeenCalledWith(1234, 36);
  expect(wait).toHaveBeenCalledWith(25);
});

test("uses default paths and delay", async () => {
  const read = jest.fn(async (path) =>
    path === "/run/keepalived.pid" ? "1" : path === "/proc/1/comm" ? "keepalived" : state,
  );
  const wait = jest.fn();
  await collectVrrpSnapshot(
    {},
    {
      readFile: read,
      readlink: async () => "/usr/sbin/keepalived",
      run: async () => ({ stdout: "36" }),
      signalProcess: jest.fn(),
      wait,
    },
  );
  expect(read.mock.calls).toEqual([
    ["/run/keepalived.pid", "utf8"],
    ["/proc/1/comm", "utf8"],
    ["/tmp/keepalived.json", "utf8"],
  ]);
  expect(wait).toHaveBeenCalledWith(50);
});

test("falls back to the snapshot when the signal command fails", async () => {
  const read = jest.fn(async (path) =>
    path === "/pid" ? "1234" : path === "/proc/1234/comm" ? "keepalived" : state,
  );
  await expect(
    collectVrrpSnapshot(
      { pidPath: "/pid", path: "/state" },
      {
        readFile: read,
        readlink: async () => "/usr/sbin/keepalived",
        run: async () => {
          throw new Error("unsupported");
        },
      },
    ),
  ).resolves.toBe(state);
});

test("uses the snapshot when an asynchronous signal adapter rejects", async () => {
  const read = jest.fn(async (path) =>
    path === "/pid" ? "1234" : path === "/proc/1234/comm" ? "keepalived" : state,
  );
  await expect(
    collectVrrpSnapshot(
      { pidPath: "/pid", path: "/state" },
      {
        readFile: read,
        readlink: async () => "/usr/sbin/keepalived",
        run: async () => ({ stdout: "36" }),
        signalProcess: async () => {
          throw new Error("signal adapter failed");
        },
      },
    ),
  ).resolves.toBe(state);
});

test("skips signaling for an invalid process ID or signal", async () => {
  const read = jest.fn(async (path) => (path === "/pid" ? "0" : state));
  const signalProcess = jest.fn();
  await collectVrrpSnapshot(
    { pidPath: "/pid", path: "/state" },
    { readFile: read, run: jest.fn(), signalProcess, wait: jest.fn() },
  );
  expect(signalProcess).not.toHaveBeenCalled();
  read.mockImplementation(async (path) =>
    path === "/pid" ? "5" : path === "/proc/5/comm" ? "keepalived" : state,
  );
  await collectVrrpSnapshot(
    { pidPath: "/pid", path: "/state" },
    {
      readFile: read,
      readlink: async () => "/usr/sbin/keepalived",
      run: async () => ({ stdout: "unknown" }),
      signalProcess,
      wait: jest.fn(),
    },
  );
  expect(signalProcess).not.toHaveBeenCalled();
  await collectVrrpSnapshot(
    { pidPath: "/pid", path: "/state" },
    {
      readFile: async (path) =>
        path === "/pid" ? "5" : path === "/proc/5/comm" ? "keepalived" : state,
      readlink: async () => "/usr/sbin/keepalived",
      run: async () => ({ stdout: "9999" }),
      signalProcess,
      wait: jest.fn(),
    },
  );
  expect(signalProcess).not.toHaveBeenCalled();
});

test("uses the snapshot when reading the process ID fails", async () => {
  const read = jest.fn(async (path) => {
    if (path === "/pid") throw new Error("missing PID");
    return state;
  });
  await expect(
    collectVrrpSnapshot({ pidPath: "/pid", path: "/state" }, { readFile: read, run: jest.fn() }),
  ).resolves.toBe(state);
});

test("does not signal a PID owned by another process", async () => {
  const run = jest.fn();
  const signalProcess = jest.fn();
  const read = jest.fn(async (path) => {
    if (path === "/pid") return "1234";
    if (path === "/proc/1234/comm") return "systemd";
    return state;
  });
  await expect(
    collectVrrpSnapshot(
      { pidPath: "/pid", path: "/state" },
      { readFile: read, run, signalProcess, wait: jest.fn() },
    ),
  ).resolves.toBe(state);
  expect(run).not.toHaveBeenCalled();
  expect(signalProcess).not.toHaveBeenCalled();
});

test("runs the verified Keepalived executable through its proc entry", async () => {
  const run = jest.fn().mockResolvedValue({ stdout: "36" });
  await collectVrrpSnapshot(
    { pidPath: "/pid", path: "/state" },
    {
      readFile: async (path) =>
        path === "/pid" ? "1234" : path === "/proc/1234/comm" ? "keepalived" : state,
      readlink: async (path) => {
        expect(path).toBe("/proc/1234/exe");
        return "/usr/sbin/keepalived";
      },
      run,
      signalProcess: jest.fn(),
      wait: jest.fn(),
    },
  );
  expect(run).toHaveBeenCalledWith("/proc/1234/exe", ["--signum=JSON"], {
    timeout: 10_000,
  });
});

test("does not run a different executable with a Keepalived process name", async () => {
  const run = jest.fn();
  const signalProcess = jest.fn();
  await collectVrrpSnapshot(
    { pidPath: "/pid", path: "/state" },
    {
      readFile: async (path) =>
        path === "/pid" ? "1234" : path === "/proc/1234/comm" ? "keepalived" : state,
      readlink: async () => "/usr/bin/other-daemon",
      run,
      signalProcess,
      wait: jest.fn(),
    },
  );
  expect(run).not.toHaveBeenCalled();
  expect(signalProcess).not.toHaveBeenCalled();
});

test("uses default filesystem, signal, wait, and timeout dependencies", async () => {
  defaultReadFile.mockImplementation(async (path) =>
    path === "/pid" ? "1234" : path === "/proc/1234/comm" ? "keepalived" : state,
  );
  defaultReadlink.mockResolvedValue("/usr/sbin/keepalived");
  const run = jest.fn().mockResolvedValue({ stdout: "36" });
  const signalProcess = jest.fn();
  await expect(
    collectVrrpSnapshot(
      { pidPath: "/pid", path: "/state" },
      { run, signalProcess, vrrpDelayMs: 0 },
    ),
  ).resolves.toBe(state);
  expect(run).toHaveBeenCalledWith("/proc/1234/exe", ["--signum=JSON"], {
    timeout: 10_000,
  });
  expect(defaultReadFile).toHaveBeenCalledWith("/state", "utf8");
  defaultReadFile.mockImplementation(async (path) => (path === "/pid" ? "0" : state));
  await collectVrrpSnapshot({ pidPath: "/pid", path: "/state" }, { run });
});

test("reads the configured snapshot with default dependencies", async () => {
  defaultReadFile.mockResolvedValue(state);
  await expect(collectVrrpSnapshot({ path: "/state" })).resolves.toBe(state);
  expect(defaultReadFile).toHaveBeenCalledWith("/state", "utf8");
});
