export default function summarizeRoutes(routes) {
  const entries = routes.map(({ dst, gateway, dev, protocol, scope, metric, table, type }) => ({
    destination: dst ?? "default",
    gateway: gateway ?? null,
    interface: dev ?? null,
    protocol: protocol ?? null,
    scope: scope ?? null,
    metric: metric ?? null,
    table: table ?? null,
    type: type ?? null,
  }));
  return {
    totals: {
      routes: entries.length,
      defaultRoutes: entries.filter(({ destination }) => destination === "default").length,
      protocols: new Set(entries.map(({ protocol }) => protocol).filter(Boolean)).size,
    },
    routes: entries,
  };
}
