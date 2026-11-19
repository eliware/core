function iscCount(source, now) {
  const latest = new Set();
  for (const [, address, body] of source.matchAll(/lease\s+(\S+)\s*\{([\s\S]*?)\}/gu)) {
    const ends = body.match(/ends\s+(?:\d+\s+)?([^;]+);/u)?.[1]?.trim();
    const binding = body.match(/binding state\s+(\w+)/u)?.[1];
    const expiry = ends ? Date.parse(`${ends.replaceAll("/", "-").replace(/\s+/u, "T")}Z`) : NaN;
    if (binding === "active" && Number.isFinite(expiry) && expiry > now) latest.add(address);
    else latest.delete(address);
  }
  return latest.size;
}

function dnsmasqCount(source, now) {
  return source.split(/\r?\n/u).reduce((total, line) => {
    const fields = line.trim().split(/\s+/u);
    return /^\d+$/u.test(fields[0]) && Number(fields[0]) * 1000 > now && Boolean(fields[2])
      ? total + 1
      : total;
  }, 0);
}

function keaCount(source, now) {
  const rows = source.trim().split(/\r?\n/u);
  if (rows.length < 2) return 0;
  const headers = rows[0].split(",").map((value) => value.replace(/^"|"$/gu, ""));
  const index = Object.fromEntries(headers.map((header, position) => [header, position]));
  return rows.slice(1).reduce((total, line) => {
    const values = line
      .match(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/gu)
      .map((value) => value.replace(/,$/u, "").replace(/^"|"$/gu, "").replace(/""/gu, '"'));
    const expiry = Number(values[index.expire]);
    return values[index.address] &&
      Number.isFinite(expiry) &&
      expiry * 1000 > now &&
      values[index.state] === "0"
      ? total + 1
      : total;
  }, 0);
}

export default function summarizeLeases(source, format, now = Date.now()) {
  const activeLeases =
    format === "isc"
      ? iscCount(source, now)
      : format === "dnsmasq"
        ? dnsmasqCount(source, now)
        : keaCount(source, now);
  return { totals: { activeLeases } };
}
