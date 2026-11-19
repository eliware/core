import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { expect, jest, test } from "@jest/globals";
import createSystemdEventMonitor from "../../src/backend/systemd-event-monitor.mjs";

function childProcess() {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = jest.fn(() => {
    child.killed = true;
  });
  child.killed = false;
  return child;
}

test("streams relevant unit events and suppresses duplicates during one failure or stop", async () => {
  const child = childProcess();
  const spawn = jest.fn(() => child);
  const onEvent = jest.fn();
  const monitor = createSystemdEventMonitor({
    units: ["named.service", "named.service"],
    spawn,
    onEvent,
  });
  monitor.start();
  monitor.start();
  expect(spawn).toHaveBeenCalledTimes(1);
  expect(spawn).toHaveBeenCalledWith(
    "journalctl",
    ["--follow", "--output=json", "--no-pager", "--lines=0", "--unit", "named.service"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const entry = (MESSAGE) => JSON.stringify({ UNIT: "named.service", MESSAGE });
  child.stdout.write(`${entry("Failed to start Name Server.")}\n`);
  child.stdout.write(`${entry("named.service: Failed with result 'exit-code'.")}\n`);
  child.stdout.write(`${entry("Stopped Name Server.")}\n`);
  child.stdout.write(`${entry("Started Name Server.")}\n`);
  child.stdout.write(`${entry("Stopping Name Server.")}\n`);
  child.stdout.write(`${entry("Stopped Name Server.")}\n`);
  expect(onEvent.mock.calls.map(([event]) => event.event)).toEqual([
    "failed",
    "restarted",
    "stopped",
  ]);
  await monitor.stop();
  expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  await monitor.stop();
  child.killed = true;
  await monitor.stop();
  child.emit("error", new Error("late stream error"));
  child.emit("close", 1);
  const emptyDefault = createSystemdEventMonitor();
  emptyDefault.start();
  await emptyDefault.stop();
});

test("uses defaults and ignores unrelated journal lines and ordinary starts", async () => {
  const child = childProcess();
  const monitor = createSystemdEventMonitor({
    units: ["named.service"],
    spawn: () => child,
    onEvent: undefined,
    log: undefined,
    now: undefined,
  });
  monitor.start();
  child.stdout.write("not json\n");
  child.stdout.write(
    `${JSON.stringify({ UNIT: "named.service", MESSAGE: "Started Name Server." })}\n`,
  );
  child.stdout.write(
    `${JSON.stringify({ UNIT: "named.service", MESSAGE: "Stopped Name Server." })}\n`,
  );
  child.emit("error", new Error("stream failed"));
  await monitor.stop();
});

test("handles empty unit lists, spawn errors, and stream exits", async () => {
  const emptySpawn = jest.fn();
  const empty = createSystemdEventMonitor({ units: [], spawn: emptySpawn });
  empty.start();
  await empty.stop();
  expect(emptySpawn).not.toHaveBeenCalled();

  const log = { warn: jest.fn() };
  const failed = createSystemdEventMonitor({
    units: ["named.service"],
    spawn: () => {
      throw new Error("missing");
    },
    log,
  });
  failed.start();
  expect(log.warn).toHaveBeenCalledWith("Systemd event stream could not start");
  await failed.stop();

  const child = childProcess();
  const monitor = createSystemdEventMonitor({ units: ["named.service"], spawn: () => child, log });
  monitor.start();
  child.emit("error", new Error("journalctl failed"));
  child.emit("close", 1);
  expect(log.warn).toHaveBeenCalledWith("Systemd event stream is unavailable");
  expect(log.warn).toHaveBeenCalledWith("Systemd event stream stopped");
  await monitor.stop();
});

test("logs when an event callback fails", async () => {
  const child = childProcess();
  const log = { warn: jest.fn() };
  const monitor = createSystemdEventMonitor({
    units: ["named.service"],
    spawn: () => child,
    log,
    onEvent: async () => {
      throw new Error("callback failed");
    },
  });
  monitor.start();
  child.stdout.write(
    `${JSON.stringify({ UNIT: "named.service", MESSAGE: "Stopped Name Server." })}\n`,
  );
  await Promise.resolve();
  await Promise.resolve();
  expect(log.warn).toHaveBeenCalledWith("Systemd event handling failed for named.service");
  await monitor.stop();
});
