export default function summarizeNeighbors(rows) {
  const neighbors = rows.map(({ dst, lladdr, dev, state, flags }) => ({
    address: dst,
    mac: lladdr ?? null,
    interface: dev ?? null,
    state: Array.isArray(state) ? state.join(", ") : (state ?? "unknown"),
    flags: Array.isArray(flags) ? flags.join(", ") : null,
  }));
  return {
    totals: {
      neighbors: neighbors.length,
      reachable: neighbors.filter(({ state }) => state.includes("REACHABLE")).length,
      failed: neighbors.filter(({ state }) => state.includes("FAILED")).length,
    },
    neighbors,
  };
}
