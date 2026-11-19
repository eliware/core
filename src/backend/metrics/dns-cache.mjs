export default function summarizeBindStats(source) {
  const sections = [...source.matchAll(/\+\+ Cache DB RRsets \+\+([\s\S]*?)(?:\+\+|$)/gu)];
  const latest = sections.at(-1);
  if (!latest) throw new Error("Name-server cache statistics are unavailable");
  const records = Object.fromEntries(
    [...latest[1].matchAll(/^\s*([A-Z0-9]+):\s+(\d+)/gmu)].map(([, type, count]) => [
      type,
      Number(count),
    ]),
  );
  return {
    totals: { rrsets: Object.values(records).reduce((total, count) => total + count, 0) },
    records,
  };
}
