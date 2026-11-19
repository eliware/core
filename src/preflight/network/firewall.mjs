export default function validateFirewall(file, text) {
  const errors = [];
  const tables = new Map();
  let table = "";
  let committed = false;
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    const value = line.trim();
    if (!value || value.startsWith("#")) continue;
    if (value.startsWith("*")) {
      if (table && !committed)
        errors.push(`FAIL ${file}:${index + 1}: table ${table} lacks COMMIT.`);
      table = value.slice(1);
      committed = false;
      if (!/^(filter|nat|mangle|raw|security)$/u.test(table))
        errors.push(`FAIL ${file}:${index + 1}: unsupported table.`);
      if (tables.has(table)) errors.push(`FAIL ${file}:${index + 1}: duplicate table ${table}.`);
      else tables.set(table, new Set());
    } else if (value === "COMMIT") {
      if (!table || committed) errors.push(`FAIL ${file}:${index + 1}: unexpected COMMIT.`);
      committed = true;
    } else if (value.startsWith(":")) {
      const chain = value.match(/^:([A-Za-z0-9_+-]+)\s+(ACCEPT|DROP|REJECT|-)\s+\[\d+:\d+\]$/u);
      if (!table || committed || !chain || tables.get(table).has(chain?.[1]))
        errors.push(`FAIL ${file}:${index + 1}: invalid or duplicate chain declaration.`);
      else tables.get(table).add(chain[1]);
    } else if (value.startsWith("-A ")) {
      const rule = value.match(/^-A\s+([A-Za-z0-9_+-]+)\s+(.+)$/u);
      if (
        !table ||
        committed ||
        !rule ||
        !tables.get(table).has(rule?.[1]) ||
        !hasAction(rule?.[2])
      )
        errors.push(`FAIL ${file}:${index + 1}: rule has an unknown chain or missing target.`);
    } else errors.push(`FAIL ${file}:${index + 1}: unknown firewall statement.`);
  }
  if (table && !committed) errors.push(`FAIL ${file}: table ${table} lacks COMMIT.`);
  if (!tables.has("filter")) errors.push(`FAIL ${file}: filter table is required.`);
  return errors;
}

function hasAction(rule) {
  const tokens = [...rule.matchAll(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/gu)].map(
    ([token]) => token,
  );
  const targets = new Set([
    "ACCEPT",
    "DROP",
    "REJECT",
    "RETURN",
    "DNAT",
    "SNAT",
    "MASQUERADE",
    "LOG",
    "QUEUE",
    "NFQUEUE",
    "NOTRACK",
    "MARK",
    "CONNMARK",
    "CT",
    "TCPMSS",
    "TPROXY",
    "CHECKSUM",
    "CLASSIFY",
    "TRACE",
  ]);
  const valueFlags = new Map([
    ["-i", 1],
    ["-o", 1],
    ["-p", 1],
    ["-s", 1],
    ["-d", 1],
    ["-m", 1],
    ["--dport", 1],
    ["--sport", 1],
    ["--ctstate", 1],
    ["--state", 1],
    ["--to-destination", 1],
    ["--to-source", 1],
    ["--to-ports", 1],
    ["--icmp-type", 1],
    ["--icmpv6-type", 1],
    ["--comment", 1],
    ["--log-prefix", 1],
    ["--reject-with", 1],
    ["--limit", 1],
    ["--limit-burst", 1],
    ["--tcp-flags", 2],
    ["--match-set", 2],
    ["--uid-owner", 1],
    ["--gid-owner", 1],
    ["--physdev-in", 1],
    ["--physdev-out", 1],
  ]);
  const booleanFlags = new Set(["-f", "--syn", "--fragment"]);
  let actions = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "!") {
      if (!valueFlags.has(tokens[index + 1])) return false;
      continue;
    }
    if (token === "-j") {
      actions += 1;
      if (!targets.has(tokens[index + 1])) return false;
      index += 1;
      continue;
    }
    if (valueFlags.has(token)) {
      const count = valueFlags.get(token);
      for (let offset = 1; offset <= count; offset += 1) {
        if (!tokens[index + offset] || tokens[index + offset].startsWith("-")) return false;
      }
      index += count;
      continue;
    }
    if (!booleanFlags.has(token)) return false;
  }
  return actions === 1;
}
