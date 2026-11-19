import collectMetric from "./metrics/collect.mjs";

const builtInMetrics = [
  ["interfaces", "Interfaces"],
  ["routes", "Routing table"],
  ["arp", "ARP table"],
  ["frr", "FRR"],
  ["vrrp", "VRRP"],
].map(([type, name]) => ({ component: { id: type, name }, metric: { type } }));

function metricIsUnhealthy(type, values) {
  return (
    (type === "ntp" && values.synchronized === false) ||
    (type === "haproxy" &&
      (values.totals.down > 0 ||
        values.backends.some(({ state }) => !/^UP\b/u.test(state ?? "")))) ||
    (type === "frr" && values.totals.down > 0) ||
    (type === "arp" && values.totals.failed > 0) ||
    (type === "vrrp" && values.totals.fault > 0)
  );
}

export default function createMetricsMonitor({
  catalog,
  intervalMs = 300_000,
  collect = collectMetric,
  now = () => new Date(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
} = {}) {
  const catalogMetrics = (catalog?.components ?? []).flatMap((component) =>
    (component.metrics ?? []).map((metric) => ({ component, metric })),
  );
  const builtInTypes = new Set(builtInMetrics.map(({ metric }) => metric.type));
  const configured = [
    ...builtInMetrics.map(
      (builtIn) =>
        catalogMetrics.find(({ metric }) => metric.type === builtIn.metric.type) ?? builtIn,
    ),
    ...catalogMetrics.filter(({ metric }) => !builtInTypes.has(metric.type)),
  ];
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
