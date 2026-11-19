function instances(data) {
  return Object.values(data ?? {}).filter((item) => typeof item === "object" && item !== null);
}

function peersFrom(summary) {
  const peers = new Map();
  const tables = summary?.peers ? [summary, ...instances(summary)] : instances(summary);
  for (const table of tables) {
    for (const [address, peer] of Object.entries(table.peers ?? {})) {
      peers.set(address, {
        address,
        description: peer.hostname ?? peer.description ?? null,
        remoteAs: peer.remoteAs ?? peer.remote_as ?? null,
        state: peer.state ?? peer.peerState ?? "unknown",
        prefixesReceived: peer.pfxRcd ?? peer.prefixReceived ?? null,
        prefixesSent: peer.pfxSnt ?? peer.prefixSent ?? null,
        uptime: peer.peerUptime ?? null,
      });
    }
  }
  return [...peers.values()];
}

function routesFrom(source) {
  const value = typeof source === "string" ? JSON.parse(source) : source;
  const normalize = (route, prefix = route.prefix ?? route.network ?? null) => ({
    prefix,
    protocol: route.protocol ?? route.type ?? null,
    nexthops: (route.nexthops ?? [])
      .map((hop) => hop.ip ?? hop.gateway ?? hop.interfaceName)
      .filter(Boolean),
    metric: route.metric ?? null,
    selected: route.selected ?? route.bestpath ?? null,
  });
  if (Array.isArray(value)) return value.map((route) => normalize(route));
  return Object.entries(value ?? {}).flatMap(([prefix, paths]) =>
    (Array.isArray(paths) ? paths : [paths]).map((path) => normalize(path, prefix)),
  );
}

export default function summarizeFrr(summarySource, routeSource) {
  const summary = typeof summarySource === "string" ? JSON.parse(summarySource) : summarySource;
  const peers = peersFrom(summary);
  const routes = routesFrom(routeSource);
  const established = peers.filter(({ state }) => /^established$/iu.test(String(state))).length;
  return {
    totals: {
      peers: peers.length,
      established,
      down: peers.length - established,
      routes: routes.length,
    },
    peers,
    routes,
  };
}
