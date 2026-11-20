import { expect, jest, test } from "@jest/globals";
import createSystemdEventChild from "../../test-fixtures/systemd-event-child.mjs";
import createSystemdEventMonitor from "../../src/backend/systemd-event-monitor.mjs";

const childProcess = () => createSystemdEventChild(jest);

test("streams failures, stops, and restarts while suppressing duplicate events", async () => {
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
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
  expect(onEvent.mock.calls.map(([event]) => event.event)).toEqual([
    "failed",
    "stopped",
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
  await monitor.stop();
});

test("restarts journal monitoring after the stream closes", async () => {
  const first = childProcess();
  const second = childProcess();
  const spawn = jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
  let restart;
  const timeout = { unref: jest.fn() };
  const setTimeoutFn = jest.fn((callback, delay) => {
    if (delay === 250) restart = callback;
    else expect(delay).toBe(5000);
    return timeout;
  });
  const clearTimeoutFn = jest.fn();
  const monitor = createSystemdEventMonitor({
    units: ["named.service"],
    spawn,
    setTimeoutFn,
    clearTimeoutFn,
    restartDelayMs: 250,
  });
  monitor.start();
  first.emit("close", 1);
  expect(setTimeoutFn).toHaveBeenCalledTimes(1);
  expect(timeout.unref).toHaveBeenCalledTimes(1);
  restart();
  expect(spawn).toHaveBeenCalledTimes(2);
  await monitor.stop();
  expect(second.kill).toHaveBeenCalledWith("SIGTERM");

  const stoppedChild = childProcess();
  let canceledRestart;
  const stoppedMonitor = createSystemdEventMonitor({
    units: ["named.service"],
    spawn: () => stoppedChild,
    setTimeoutFn: (callback, delay) => {
      if (delay === 1000) canceledRestart = callback;
      return timeout;
    },
    clearTimeoutFn,
  });
  stoppedMonitor.start();
  stoppedChild.emit("close", 1);
  await stoppedMonitor.stop();
  expect(clearTimeoutFn).toHaveBeenCalledWith(timeout);
  canceledRestart();
});

test("waits for the journal child to exit during shutdown", async () => {
  const child = childProcess();
  child.kill = jest.fn(() => {
    child.killed = true;
  });
  const monitor = createSystemdEventMonitor({ units: ["named.service"], spawn: () => child });
  monitor.start();
  let stopped = false;
  const stopping = monitor.stop().then(() => {
    stopped = true;
  });
  await Promise.resolve();
  expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  expect(stopped).toBe(false);
  child.emit("close", 0);
  await stopping;
  expect(stopped).toBe(true);

  const alreadyKilled = childProcess();
  alreadyKilled.killed = true;
  const secondMonitor = createSystemdEventMonitor({
    units: ["named.service"],
    spawn: () => alreadyKilled,
  });
  secondMonitor.start();
  const secondStop = secondMonitor.stop();
  expect(alreadyKilled.kill).not.toHaveBeenCalled();
  alreadyKilled.emit("close", 0);
  await secondStop;
});

test("waits for accepted event callbacks during shutdown", async () => {
  const child = childProcess();
  let finishEvent;
  let signalStarted;
  const eventStarted = new Promise((resolve) => {
    signalStarted = resolve;
  });
  const monitor = createSystemdEventMonitor({
    units: ["named.service"],
    spawn: () => child,
    onEvent: () =>
      new Promise((resolve) => {
        finishEvent = resolve;
        signalStarted();
      }),
  });
  monitor.start();
  child.stdout.write(
    `${JSON.stringify({ UNIT: "named.service", MESSAGE: "Stopped Name Server." })}\n`,
  );
  await eventStarted;
  let stopped = false;
  const stopping = monitor.stop().then(() => {
    stopped = true;
  });
  await Promise.resolve();
  expect(stopped).toBe(false);
  finishEvent();
  await stopping;
  expect(stopped).toBe(true);
});

test("allows an event callback to stop the monitor without deadlock", async () => {
  const child = childProcess();
  let monitor;
  let eventFinished = false;
  monitor = createSystemdEventMonitor({
    units: ["named.service"],
    spawn: () => child,
    onEvent: async () => {
      await monitor.stop();
      eventFinished = true;
    },
  });
  monitor.start();
  child.stdout.write(
    `${JSON.stringify({ UNIT: "named.service", MESSAGE: "Stopped Name Server." })}\n`,
  );
  for (let index = 0; index < 12 && !eventFinished; index += 1) await Promise.resolve();
  expect(eventFinished).toBe(true);
  await monitor.stop();
});

test("force-stops journal children that ignore SIGTERM", async () => {
  const child = childProcess();
  let stopTimer;
  const log = { warn: jest.fn() };
  child.kill.mockImplementation(() => {
    child.killed = true;
  });
  const monitor = createSystemdEventMonitor({
    units: ["named.service"],
    spawn: () => child,
    log,
    setTimeoutFn: (callback) => {
      stopTimer = callback;
      return undefined;
    },
    clearTimeoutFn: jest.fn(),
    shutdownTimeoutMs: 250,
  });
  monitor.start();
  const stopped = monitor.stop();
  stopTimer();
  await stopped;
  expect(child.kill.mock.calls.map(([signal]) => signal)).toEqual(["SIGTERM", "SIGKILL"]);
  expect(log.warn).toHaveBeenCalledWith("Systemd event stream did not stop after SIGTERM");
  expect(log.warn).not.toHaveBeenCalledWith("Systemd event stream could not be force-stopped");

  const failedKill = childProcess();
  const failedLog = { warn: jest.fn() };
  failedKill.kill.mockImplementation((signal) => {
    failedKill.killed = true;
    if (signal === "SIGKILL") throw new Error("signal denied");
  });
  let forceTimer;
  const failedMonitor = createSystemdEventMonitor({
    units: ["named.service"],
    spawn: () => failedKill,
    log: failedLog,
    setTimeoutFn: (callback) => {
      forceTimer = callback;
      return undefined;
    },
    shutdownTimeoutMs: 250,
  });
  failedMonitor.start();
  const failedStop = failedMonitor.stop();
  forceTimer();
  await failedStop;
  expect(failedLog.warn).toHaveBeenCalledWith("Systemd event stream could not be force-stopped");
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
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
  expect(log.warn).toHaveBeenCalledWith("Systemd event handling failed for named.service");
  await monitor.stop();
});
