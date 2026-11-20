import collectMetric from "./metrics/collect.mjs";
import metricIsUnhealthy from "./metrics/health.mjs";
import createMetricsConfiguration from "./metrics/configuration.mjs";

export default function createMetricsMonitor({
  catalog,
  intervalMs = 300_000,
  collect = collectMetric,
  now = () => new Date(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
} = {}) {
  const { configured, initialStatus } = createMetricsConfiguration(catalog);
  let status = initialStatus;
  let timer;
  let running;

  async function check() {
    if (running) return running;
    running = Promise.all(
      configured.map(async ({ component, metric }) => {
        let checkedAt = null;
        try {
          checkedAt = now().toISOString();
          const values = await collect(metric, { now });
          const unhealthy = metricIsUnhealthy(metric.type, values);
          return {
            id: component.id,
            name: component.name,
            type: metric.type,
            status: unhealthy ? "unhealthy" : "healthy",
            checkedAt,
            detail: unhealthy ? "The component reports an unhealthy state" : null,
            values,
          };
        } catch (error) {
          return {
            id: component.id,
            name: component.name,
            type: metric.type,
            status: "unavailable",
            checkedAt,
            detail: error instanceof Error ? error.message : "Metric check failed",
            values: null,
          };
        }
      }),
    )
      .then((components) => {
        let checkedAt = status.checkedAt;
        try {
          checkedAt = now().toISOString();
        } catch {
          // Keep the previous timestamp when the clock source fails.
        }
        status = { checkedAt, components };
        return getStatus();
      })
      .finally(() => {
        running = undefined;
      });
    return running;
  }

  function getStatus() {
    return structuredClone(status);
  }

  return {
    check,
    getStatus,
    start() {
      if (timer !== undefined) return;
      timer = setIntervalFn(() => void check(), intervalMs);
      timer.unref?.();
      void check();
    },
    async stop() {
      if (timer !== undefined) clearIntervalFn(timer);
      timer = undefined;
      await running;
    },
  };
}
