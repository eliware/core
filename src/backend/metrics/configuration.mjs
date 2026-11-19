const builtInMetrics = [
  ["interfaces", "Interfaces"],
  ["routes", "Routing table"],
  ["arp", "ARP table"],
  ["frr", "FRR"],
  ["vrrp", "VRRP"],
].map(([type, name]) => ({ component: { id: type, name }, metric: { type } }));

export default function createMetricsConfiguration(catalog) {
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
  const initialStatus = {
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
  return { configured, initialStatus };
}
