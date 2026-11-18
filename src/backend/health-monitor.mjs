import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import checkHealthUnit from "./health/check-unit.mjs";

const execFile = promisify(nodeExecFile);

export default function createHealthMonitor({
  units = [],
  intervalMs = 300_000,
  checkUnit = (unit) => execFile("systemctl", ["is-active", "--quiet", unit]),
  onUnhealthy = async () => {},
  now = () => new Date(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
} = {}) {
  let checks = units.map((name) => ({ name, status: "unknown", checkedAt: null }));
  let timer;
  let running;
  let generation = 0;
  let stopped = true;

  async function check() {
    if (running) return running;
    const checkGeneration = generation;
    const current = Promise.all(units.map((name) => checkHealthUnit(name, checkUnit, now)))
      .then(async (results) => {
        if (checkGeneration !== generation) return getStatus();
        checks = results;
        for (const result of results) {
          if (checkGeneration !== generation) break;
          if (result.status === "unhealthy") {
            try {
              await onUnhealthy(result);
            } catch {
              // Notification failures do not change health results or stop future checks.
            }
          }
        }
        return getStatus();
      })
      .finally(() => {
        if (running === current) running = undefined;
      });
    running = current;
    return current;
  }

  async function recordCheckSetupFailure(checkGeneration) {
    if (checkGeneration !== generation) return;
    checks = checks.map((item) => ({
      ...item,
      status: "unhealthy",
      checkedAt: null,
      detail: "Health check could not start",
    }));
    for (const result of checks) {
      try {
        await onUnhealthy(result);
      } catch {
        // Notification failures do not change health results or stop future checks.
      }
    }
  }

  function startCheck() {
    if (stopped) return;
    const checkGeneration = generation;
    void check().catch(() => recordCheckSetupFailure(checkGeneration));
  }

  function getStatus() {
    const status =
      checks.length === 0
        ? "unconfigured"
        : checks.some((item) => item.status === "unhealthy")
          ? "unhealthy"
          : checks.every((item) => item.status === "healthy")
            ? "healthy"
            : "unknown";
    return {
      status,
      checkedAt: checks.reduce((latest, item) => item.checkedAt ?? latest, null),
      units: checks,
    };
  }

  return {
    check,
    getStatus,
    start() {
      if (timer !== undefined) return;
      stopped = false;
      startCheck();
      timer = setIntervalFn(startCheck, intervalMs);
      timer.unref?.();
    },
    async stop() {
      stopped = true;
      generation += 1;
      if (timer !== undefined) clearIntervalFn(timer);
      timer = undefined;
      running = undefined;
    },
  };
}
