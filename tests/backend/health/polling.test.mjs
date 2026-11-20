import { expect, jest, test } from "@jest/globals";
import createHealthPolling from "../../../src/backend/health/polling.mjs";

function createPolling(options = {}) {
  return createHealthPolling({
    intervalMs: 300_000,
    runCheck: async () => {},
    onSetupFailure: () => {},
    setIntervalFn: () => ({ unref() {} }),
    clearIntervalFn: () => {},
    ...options,
  });
}

test("schedules checks once and ignores timer callbacks after shutdown", async () => {
  let scheduledCheck;
  const timer = { unref: jest.fn() };
  const runCheck = jest.fn();
  const setIntervalFn = jest.fn((callback) => {
    scheduledCheck = callback;
    return timer;
  });
  const clearIntervalFn = jest.fn();
  const polling = createPolling({ runCheck, setIntervalFn, clearIntervalFn });

  polling.start();
  polling.start();
  await polling.getActiveCheck();
  expect(setIntervalFn).toHaveBeenCalledTimes(1);
  expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 300_000);
  expect(timer.unref).toHaveBeenCalledTimes(1);
  expect(runCheck).toHaveBeenCalledTimes(1);

  scheduledCheck();
  await polling.getActiveCheck();
  expect(runCheck).toHaveBeenCalledTimes(2);
  await polling.stop();
  scheduledCheck();
  expect(clearIntervalFn).toHaveBeenCalledWith(timer);
  expect(runCheck).toHaveBeenCalledTimes(2);
  expect(polling.isStopped()).toBe(true);
});

test("shares an active check and waits for it during shutdown", async () => {
  let finishCheck;
  let isCurrent;
  const polling = createPolling({
    runCheck: (isCurrentCheck) => {
      isCurrent = isCurrentCheck;
      return new Promise((resolve) => {
        finishCheck = resolve;
      });
    },
  });
  const first = polling.check();
  const second = polling.check();
  expect(second).toBe(first);
  await Promise.resolve();

  let stopped = false;
  const stopping = polling.stop().then(() => {
    stopped = true;
  });
  expect(isCurrent()).toBe(false);
  expect(stopped).toBe(false);
  finishCheck();
  await Promise.all([first, stopping]);
  expect(stopped).toBe(true);
});

test("runs one new check when polling restarts during an older check", async () => {
  const finishes = [];
  const runCheck = jest.fn(
    () =>
      new Promise((resolve) => {
        finishes.push(resolve);
      }),
  );
  const polling = createPolling({
    setIntervalFn: () => 1,
    clearIntervalFn: jest.fn(),
    runCheck,
  });
  polling.start();
  await Promise.resolve();
  const stopping = polling.stop();
  polling.start();
  expect(runCheck).toHaveBeenCalledTimes(1);
  finishes[0]();
  await stopping;
  await Promise.resolve();
  expect(runCheck).toHaveBeenCalledTimes(2);
  await polling.stop({ waitForActive: false });
  finishes[1]();
});

test("reports a scheduled check failure only for its active generation", async () => {
  let scheduledCheck;
  let rejectSecondCheck;
  const runCheck = jest
    .fn()
    .mockImplementationOnce(() => {
      throw new Error("first failure");
    })
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectSecondCheck = reject;
        }),
    );
  const onSetupFailure = jest.fn();
  const polling = createPolling({
    runCheck,
    onSetupFailure,
    setIntervalFn: (callback) => {
      scheduledCheck = callback;
      return 1;
    },
  });
  polling.start();
  await expect(polling.getActiveCheck()).rejects.toThrow("first failure");
  await Promise.resolve();
  expect(onSetupFailure).toHaveBeenCalledTimes(1);
  expect(onSetupFailure.mock.calls[0][0]()).toBe(true);

  scheduledCheck();
  await Promise.resolve();
  const activeCheck = polling.getActiveCheck();
  await polling.stop({ waitForActive: false });
  rejectSecondCheck(new Error("stopped failure"));
  await expect(activeCheck).rejects.toThrow("stopped failure");
  await Promise.resolve();
  expect(onSetupFailure).toHaveBeenCalledTimes(2);
  expect(onSetupFailure.mock.calls[1][0]()).toBe(false);
});

test("keeps polling stopped when timer setup fails", async () => {
  let scheduledCheck;
  let setupFailure = true;
  const setIntervalFn = jest.fn((callback) => {
    if (setupFailure) {
      setupFailure = false;
      throw new Error("timer setup failed");
    }
    scheduledCheck = callback;
    return 0;
  });
  const clearIntervalFn = jest.fn();
  const runCheck = jest.fn();
  const polling = createPolling({ runCheck, setIntervalFn, clearIntervalFn });

  expect(() => polling.start()).toThrow("timer setup failed");
  expect(polling.isStopped()).toBe(true);
  polling.start();
  await polling.getActiveCheck();
  expect(runCheck).toHaveBeenCalledTimes(1);
  scheduledCheck();
  await polling.getActiveCheck();
  await polling.stop();
  expect(clearIntervalFn).toHaveBeenCalledWith(0);
  expect(runCheck).toHaveBeenCalledTimes(2);
});
