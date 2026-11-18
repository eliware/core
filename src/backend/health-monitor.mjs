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
} = {}) {
  let checks = units.map((name) => ({ name, status: "unknown", checkedAt: null }));
  let timer;
  let running;

  async function check() {
    if (running) return running;
    running = Promise.all(units.map((name) => checkHealthUnit(name, checkUnit, now)))
      .then(async (results) => {
        checks = results;
        for (const result of results) {
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
        running = undefined;
      });
    return running;
  }

  async function recordCheckSetupFailure() {
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
    void check().catch(() => recordCheckSetupFailure());
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
      if (timer) return;
      startCheck();
      timer = setIntervalFn(startCheck, intervalMs);
      timer.unref?.();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
    },
  };
}
