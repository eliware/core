import { jest } from "@jest/globals";

const defaultExecFile = jest.fn((_command, _args, ...rest) => {
  const callback = rest.at(-1);
  callback(null, { stdout: "active" }, { stderr: "" });
});
jest.unstable_mockModule("node:child_process", () => ({ execFile: defaultExecFile }));
const createHealthMonitor = (await import("../src/backend/health-monitor.mjs")).default;
const systemdFailureEvent = {
  name: "frr.service",
  event: "failed",
  status: "unhealthy",
  state: "failed",
  checkedAt: "2026-11-19T12:00:00.000Z",
};

async function rejectInactive() {
  throw new Error("inactive");
}

async function rejectUnavailableSystemctl() {
  throw Object.assign(new Error("missing"), { code: "ENOENT" });
}

function unavailableClock() {
  throw new Error("clock unavailable");
}

function createUnhealthyMonitor(onUnhealthy) {
  return createHealthMonitor({ units: ["frr.service"], checkUnit: rejectInactive, onUnhealthy });
}
function deferred() {
  let resolve;
  const promise = new Promise((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function arrayThatFailsOnRepeatedAccess(values, property, message) {
  let reads = 0;
  return new Proxy(values, {
    get(target, key, receiver) {
      if (key === property && reads++ > 0) throw new Error(message);
      return Reflect.get(target, key, receiver);
    },
  });
}

async function flushMicrotasks(count = 6) {
  for (let attempt = 0; attempt < count; attempt += 1) await Promise.resolve();
}

export {
  arrayThatFailsOnRepeatedAccess,
  defaultExecFile,
  deferred,
  flushMicrotasks,
  createHealthMonitor,
  createUnhealthyMonitor,
  rejectInactive,
  rejectUnavailableSystemctl,
  systemdFailureEvent,
  unavailableClock,
};
