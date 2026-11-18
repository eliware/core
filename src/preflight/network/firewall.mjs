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
      tables.set(table, new Set());
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
  const tokens = rule.split(/\s+/u);
  const targets = ["ACCEPT", "DROP", "REJECT", "RETURN", "DNAT", "SNAT", "MASQUERADE", "LOG"];
  const target = tokens.indexOf("-j");
  if (target < 0 || !targets.includes(tokens[target + 1])) return false;
  const valueFlags = new Set([
    "-i",
    "-o",
    "-p",
    "-s",
    "-d",
    "-m",
    "--dport",
    "--sport",
    "--ctstate",
    "--to-destination",
    "--to-source",
    "--icmp-type",
    "--icmpv6-type",
  ]);
  return tokens.every((token, index) => !valueFlags.has(token) || Boolean(tokens[index + 1]));
}
