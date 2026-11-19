export default function summarizeInterfaces(interfaces) {
  const totals = {
    interfaces: interfaces.length,
    up: 0,
    rxBytes: 0,
    txBytes: 0,
    rxPackets: 0,
    txPackets: 0,
    errors: 0,
    dropped: 0,
  };
  const entries = interfaces.map((item) => {
    const rx = item.stats64?.rx ?? item.stats?.rx ?? {};
    const tx = item.stats64?.tx ?? item.stats?.tx ?? {};
    const entry = {
      name: item.ifname,
      state: item.operstate?.toLowerCase() ?? "unknown",
      rxBytes: Number(rx.bytes ?? 0),
      txBytes: Number(tx.bytes ?? 0),
      rxPackets: Number(rx.packets ?? 0),
      txPackets: Number(tx.packets ?? 0),
      errors: Number(rx.errors ?? 0) + Number(tx.errors ?? 0),
      dropped: Number(rx.dropped ?? 0) + Number(tx.dropped ?? 0),
      addresses: (item.addr_info ?? []).map(
        ({ family, local, prefixlen, scope }) =>
          `${family} ${local}/${prefixlen}${scope ? ` (${scope})` : ""}`,
      ),
    };
    if (item.operstate === "UP") totals.up += 1;
    for (const key of ["rxBytes", "txBytes", "rxPackets", "txPackets", "errors", "dropped"])
      totals[key] += entry[key];
    return entry;
  });
  return { totals, interfaces: entries };
}
