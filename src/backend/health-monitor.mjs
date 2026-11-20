import { execFile as nodeExecFile } from "node:child_process";
import { AsyncLocalStorage } from "node:async_hooks";
import { promisify } from "node:util";
import checkHealthUnits from "./health/check/units.mjs";
import createHealthPolling from "./health/polling.mjs";
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
  const polling = createHealthPolling({
    intervalMs,
    setIntervalFn,
    clearIntervalFn,
    onSetupFailure: (isCurrent) => {
      if (!isCurrent()) return;
      checks = checks.map((item) => ({
        ...item,
        status: "unknown",
        checkedAt: null,
        detail: "Health check could not start",
      }));
    },
    runCheck: async (isCurrent) => {
      const results = await checkHealthUnits({ units, checks, checkUnit, now });
      if (!isCurrent()) return getStatus();
      const previous = new Map(checks.map((item) => [item.name, item]));
      checks = results;
      for (const result of results) {
        if (!isCurrent()) break;
        if (result.status === "unhealthy" && previous.get(result.name)?.status !== "unhealthy") {
          try {
            const activeCheck = polling.getActiveCheck();
            await notificationContext.run(activeCheck, () => onUnhealthy(result));
          } catch {
            // Notification failures do not change health results or stop future checks.
          }
        }
      }
      return getStatus();
    },
  });

  function getStatus() {
    return createHealthStatus(checks);
  }

  async function recordEvent(event) {
    const activeCheck = polling.getActiveCheck();
    if (activeCheck) await activeCheck;
    const update = createUnitEventUpdate(checks, event);
    if (!update) return undefined;
    checks = update.checks;
    if (update.shouldNotify && !polling.isStopped()) {
      try {
        await onSystemdEvent({ ...event, result: update.result });
      } catch {
        // Notification failures do not change health results or stop future checks.
      }
    }
    return update.result;
  }

  async function stop() {
    const activeCheck = polling.getActiveCheck();
    await polling.stop({ waitForActive: notificationContext.getStore() !== activeCheck });
  }

  return {
    check: polling.check,
    getStatus,
    recordEvent,
    start: polling.start,
    stop,
  };
}
