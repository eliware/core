import { expect, jest, test } from "@jest/globals";
import { EventEmitter } from "node:events";
import readSocket from "../../../src/backend/metrics/socket-reader.mjs";

const response =
  "# pxname,svname,status,scur,stot,bin,bout,econ,eresp\nweb,BACKEND,UP,0,1,2,3,0,0\n";

test("reads HAProxy stats from the Unix socket", async () => {
  const socket = new EventEmitter();
  socket.setEncoding = jest.fn();
  socket.end = jest.fn(() => {
    socket.emit("data", response);
    socket.emit("end");
    socket.emit("close");
  });
  socket.destroy = jest.fn();
  const connect = jest.fn(() => socket);
  const result = readSocket("/run/haproxy.sock", 10_000, connect);
  socket.emit("connect");
  await expect(result).resolves.toBe(response);
  expect(connect).toHaveBeenCalledWith("/run/haproxy.sock");
  expect(socket.setEncoding).toHaveBeenCalledWith("utf8");
  expect(socket.end).toHaveBeenCalledWith("show stat\n");
});

test("rejects socket errors and timeouts", async () => {
  const failedSocket = new EventEmitter();
  failedSocket.setEncoding = jest.fn();
  failedSocket.destroy = (error) => failedSocket.emit("error", error);
  const failed = readSocket("/missing.sock", 10_000, () => failedSocket);
  failedSocket.emit("error", new Error("socket unavailable"));
  await expect(failed).rejects.toThrow("socket unavailable");

  jest.useFakeTimers();
  try {
    const stalledSocket = new EventEmitter();
    stalledSocket.setEncoding = jest.fn();
    stalledSocket.destroy = (error) => stalledSocket.emit("error", error);
    const stalled = readSocket("/stalled.sock", 10, () => stalledSocket);
    const rejection = expect(stalled).rejects.toThrow("HAProxy socket timed out");
    await jest.advanceTimersByTimeAsync(10);
    await rejection;
  } finally {
    jest.useRealTimers();
  }
});
