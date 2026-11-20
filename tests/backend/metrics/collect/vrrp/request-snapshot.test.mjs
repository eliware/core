import { expect, jest, test } from "@jest/globals";
import requestVrrpSnapshot from "../../../../../src/backend/metrics/collect/vrrp/request-snapshot.mjs";

test("verifies and signals the Keepalived process", async () => {
  const readFile = jest.fn().mockResolvedValueOnce("1234").mockResolvedValueOnce("keepalived");
  const run = jest.fn().mockResolvedValue({ stdout: "36" });
  const signalProcess = jest.fn();
  const wait = jest.fn();
  await requestVrrpSnapshot(
    { pidPath: "/pid" },
    {
      readFile,
      readlink: jest.fn().mockResolvedValue("/usr/sbin/keepalived"),
      run,
      signalProcess,
      wait,
    },
  );
  expect(signalProcess).toHaveBeenCalledWith(1234, 36);
  expect(wait).toHaveBeenCalledWith(50);
});

test("does not signal when executable verification fails", async () => {
  const run = jest.fn();
  await requestVrrpSnapshot(
    { pidPath: "/pid" },
    {
      readFile: jest.fn().mockResolvedValueOnce("1234").mockResolvedValueOnce("keepalived"),
      readlink: jest.fn().mockResolvedValue("/usr/bin/other"),
      run,
      signalProcess: jest.fn(),
    },
  );
  expect(run).not.toHaveBeenCalled();
});
