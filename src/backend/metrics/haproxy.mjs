function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function sum(rows, key) {
  return rows.reduce((total, row) => total + number(row[key]), 0);
}

export default function parseHaproxyStats(csv) {
  const lines = csv.trim().split(/\r?\n/u).filter(Boolean);
  if (lines.length < 2) throw new Error("HAProxy returned no statistics");
  const headers = lines[0].replace(/^#\s*/u, "").split(",");
  const rows = lines
    .slice(1)
    .map((line) =>
      Object.fromEntries(line.split(",").map((value, index) => [headers[index], value])),
    );
  const servers = rows.filter(({ svname }) => svname !== "FRONTEND" && svname !== "BACKEND");
  const backendRows = rows.filter(({ svname }) => svname === "BACKEND");
  return {
    totals: {
      backends: new Set(backendRows.map(({ pxname }) => pxname)).size,
      servers: servers.length,
      up: servers.filter(({ status }) => /\bUP\b/u.test(status ?? "")).length,
      down: servers.filter(({ status }) => /\bDOWN\b/u.test(status ?? "")).length,
      sessions: sum(backendRows, "scur"),
      sessionsTotal: sum(backendRows, "stot"),
      bytesIn: sum(backendRows, "bin"),
      bytesOut: sum(backendRows, "bout"),
      errors: sum(backendRows, "econ") + sum(backendRows, "eresp"),
    },
    backends: backendRows.map(({ pxname, status, scur, stot, bin, bout, econ, eresp }) => ({
      name: pxname,
      state: status,
      sessions: number(scur),
      sessionsTotal: number(stot),
      bytesIn: number(bin),
      bytesOut: number(bout),
      errors: number(econ) + number(eresp),
    })),
  };
}
