import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";

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
    running = Promise.all(
      units.map(async (name) => {
        try {
          await checkUnit(name);
          return { name, status: "healthy", checkedAt: now().toISOString() };
        } catch (error) {
          return {
            name,
            status: "unhealthy",
            checkedAt: now().toISOString(),
            detail: error?.code === "ENOENT" ? "systemctl is unavailable" : "Unit is not active",
          };
        }
      }),
    )
      .then(async (results) => {
        checks = results;
        for (const result of results) {
          if (result.status === "unhealthy") await onUnhealthy(result);
        }
        return getStatus();
      })
      .finally(() => {
        running = undefined;
      });
    return running;
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
      void check();
      timer = setIntervalFn(() => void check(), intervalMs);
      timer.unref?.();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
    },
  };
}
