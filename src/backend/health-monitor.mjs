import { execFile as nodeExecFile } from "node:child_process";
import { AsyncLocalStorage } from "node:async_hooks";
import { promisify } from "node:util";
import checkHealthUnits from "./health/check/units.mjs";
import createUnitEventUpdate from "./health/record-event.mjs";
import createHealthStatus from "./health/status.mjs";

const execFile = promisify(nodeExecFile);
const notificationContext = new AsyncLocalStorage();

export default function createHealthMonitor({
  units = [],
  intervalMs = 300_000,
  healthCheckTimeoutMs = 10_000,
  checkUnit = (unit) =>
    execFile("systemctl", ["is-active", "--quiet", unit], { timeout: healthCheckTimeoutMs }),
  onUnhealthy = async () => {},
  onSystemdEvent = async () => {},
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
    const current = checkHealthUnits({ units, checks, checkUnit, now })
      .then(async (results) => {
        if (checkGeneration !== generation) return getStatus();
        const previous = new Map(checks.map((item) => [item.name, item]));
        checks = results;
        for (const result of results) {
          if (checkGeneration !== generation) break;
          if (result.status === "unhealthy" && previous.get(result.name)?.status !== "unhealthy") {
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

  async function recordEvent(event) {
    if (running) await running;
    const update = createUnitEventUpdate(checks, event);
    if (!update) return undefined;
    checks = update.checks;
    if (update.shouldNotify && !stopped) {
      try {
        await onSystemdEvent({ ...event, result: update.result });
      } catch {
        // Notification failures do not change health results or stop future checks.
      }
    }
    return update.result;
  }

  return {
    check,
    getStatus,
    recordEvent,
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
