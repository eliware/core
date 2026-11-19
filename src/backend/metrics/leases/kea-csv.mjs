export default function countKeaLeases(source, now) {
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
