import collectMetric from "./metrics/collect.mjs";

export default function createMetricsMonitor({
  catalog,
  intervalMs = 300_000,
  collect = collectMetric,
  now = () => new Date(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
} = {}) {
  const configured = (catalog?.components ?? []).flatMap((component) =>
    (component.metrics ?? []).map((metric) => ({ component, metric })),
  );
  let status = {
    checkedAt: null,
    components: configured.map(({ component, metric }) => ({
      id: component.id,
      name: component.name,
      type: metric.type,
      status: "unknown",
      checkedAt: null,
      detail: "Waiting for first check",
      values: null,
    })),
  };
  let timer;
  let running;

  async function check() {
    if (running) return running;
    running = Promise.all(
      configured.map(async ({ component, metric }) => {
        const checkedAt = now().toISOString();
        try {
          const values = await collect(metric, { now });
          const unhealthy =
            (metric.type === "ntp" && values.synchronized === false) ||
            (metric.type === "haproxy" &&
              (values.totals.down > 0 ||
                values.backends.some(({ state }) => !/^UP\b/u.test(state ?? ""))));
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
        status = { checkedAt: now().toISOString(), components };
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
