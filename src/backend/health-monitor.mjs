import { execFile as nodeExecFile } from "node:child_process";
import { AsyncLocalStorage } from "node:async_hooks";
import { promisify } from "node:util";
import checkHealthUnit from "./health/check-unit.mjs";
import createHealthStatus from "./health/status.mjs";

const execFile = promisify(nodeExecFile);
const notificationContext = new AsyncLocalStorage();
const maxConcurrentUnitChecks = 4;

export default function createHealthMonitor({
  units = [],
  intervalMs = 300_000,
  healthCheckTimeoutMs = 10_000,
  checkUnit = (unit) =>
    execFile("systemctl", ["is-active", "--quiet", unit], { timeout: healthCheckTimeoutMs }),
  onUnhealthy = async () => {},
  now = () => new Date(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
} = {}) {
  let checks = units.map((name) => ({ name, status: "unknown", checkedAt: null }));
  let timer;
  let running;
  let runningGeneration;
  let restartScheduled = false;
  let generation = 0;
  let stopped = true;

  async function check() {
    if (running) return running;
    const checkGeneration = generation;
    const current = runUnitChecks()
      .then(async (results) => {
        if (checkGeneration !== generation) return getStatus();
        checks = results;
        for (const result of results) {
          if (checkGeneration !== generation) break;
          if (result.status === "unhealthy") {
            try {
              await notificationContext.run(current, () => onUnhealthy(result));
            } catch {
              // Notification failures do not change health results or stop future checks.
            }
          }
        }
        return getStatus();
      })
      .finally(() => {
        running = undefined;
        runningGeneration = undefined;
        if (restartScheduled) {
          restartScheduled = false;
          startCheck();
        }
      });
    running = current;
    runningGeneration = checkGeneration;
    return current;
  }

  async function runUnitChecks() {
    const results = Array.from({ length: units.length });
    let nextIndex = 0;
    async function runNext() {
      while (nextIndex < units.length) {
        const index = nextIndex;
        nextIndex += 1;
        const name = checks[index].name;
        try {
          results[index] = await checkHealthUnit(units[index], checkUnit, now);
        } catch {
          results[index] = {
            name,
            status: "unknown",
            checkedAt: null,
            detail: "Health check could not start",
          };
        }
      }
    }
    const workers = Array.from({ length: Math.min(units.length, maxConcurrentUnitChecks) }, () =>
      runNext(),
    );
    await Promise.all(workers);
    return results;
  }

  async function recordCheckSetupFailure(checkGeneration) {
    if (checkGeneration !== generation) return;
    checks = checks.map((item) => ({
      ...item,
      status: "unknown",
      checkedAt: null,
      detail: "Health check could not start",
    }));
  }

  function startCheck() {
    if (stopped) return;
    if (running && runningGeneration !== generation) {
      restartScheduled = true;
      return;
    }
    const checkGeneration = generation;
    void check().catch(() => recordCheckSetupFailure(checkGeneration));
  }

  function getStatus() {
    return createHealthStatus(checks);
  }

  return {
    check,
    getStatus,
    start() {
      if (timer !== undefined) return;
      const nextTimer = setIntervalFn(startCheck, intervalMs);
      timer = nextTimer;
      stopped = false;
      timer.unref?.();
      startCheck();
    },
    async stop() {
      stopped = true;
      generation += 1;
      restartScheduled = false;
      if (timer !== undefined) clearIntervalFn(timer);
      timer = undefined;
      const activeCheck = running;
      if (activeCheck && notificationContext.getStore() !== activeCheck) await activeCheck;
    },
  };
}
