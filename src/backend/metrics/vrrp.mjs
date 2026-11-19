const states = { 0: "INIT", 1: "BACKUP", 2: "MASTER", 3: "FAULT", 98: "STOP" };

function entries(dump) {
  if (Array.isArray(dump)) return dump;
  const list = dump.v1 ?? dump.v2 ?? dump.instances ?? [];
  return Array.isArray(list) ? list : Object.values(list);
}

export default function summarizeVrrp(source) {
  const dump = typeof source === "string" ? JSON.parse(source) : source;
  const instances = entries(dump).map(({ data = {}, stats = {} }) => ({
    name: data.iname ?? data.name ?? "Unknown instance",
    state:
      typeof data.state === "number"
        ? (states[data.state] ?? "UNKNOWN")
        : (data.state ?? "UNKNOWN"),
    interface: data.ifp_ifname ?? data.interface ?? null,
    priority: data.effective_priority ?? data.base_priority ?? data.priority ?? null,
    virtualRouterId: data.vrid ?? data.virtual_router_id ?? null,
    virtualAddresses: (data.vips ?? data.virtual_addresses ?? []).map(
      (value) => String(value).split(/\s+/u)[0],
    ),
    peers: (data.unicast_peers ?? data.unicast_peer ?? []).map((peer) =>
      typeof peer === "string" ? peer : (peer.address ?? peer.ip ?? "unknown"),
    ),
    advertisementsReceived: stats.advert_rcvd ?? null,
    advertisementsSent: stats.advert_sent ?? null,
    masterTransitions: stats.become_master ?? null,
  }));
  return {
    totals: {
      instances: instances.length,
      master: instances.filter(({ state }) => state === "MASTER").length,
      backup: instances.filter(({ state }) => state === "BACKUP").length,
      fault: instances.filter(({ state }) => state === "FAULT").length,
    },
    instances,
  };
}
