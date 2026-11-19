export default function hasFirewallRuleAction(rule) {
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
