import { isIP } from "node:net";

export default function parseInstances(text) {
  const instances = new Map();
  const headers = [...text.matchAll(/vrrp_instance\s+(\S+)\s*\{/gu)];
  for (const header of headers) {
    let depth = 1;
    let end = header.index + header[0].length;
    while (depth > 0 && end < text.length) {
      if (text[end] === "{") depth += 1;
      if (text[end] === "}") depth -= 1;
      end += 1;
    }
    if (depth !== 0) return null;
    const body = text.slice(header.index + header[0].length, end - 1);
    const value = (pattern) => body.match(pattern)?.[1];
    const virtualIps = parseVirtualIps(body);
    instances.set(header[1], {
      id: value(/virtual_router_id\s+(\d+)/u),
      state: value(/state\s+(MASTER|BACKUP)/u),
      priority: Number(value(/priority\s+(\d+)/u)),
      source: value(/unicast_src_ip\s+(\S+)/u),
      peer: body.match(/unicast_peer\s*\{\s*(\S+)/u)?.[1],
      vips: virtualIps.valid.sort(),
      invalidVips: virtualIps.invalid,
    });
  }
  return instances.size > 0 ? instances : null;
}

function parseVirtualIps(body) {
  const block = body.match(/virtual_ipaddress\s*\{([^}]*)\}/u);
  if (!block) return { valid: [], invalid: ["missing"] };
  const valid = [];
  const invalid = [];
  for (const line of block[1].split(/\r?\n/u)) {
    const tokens = line.split("#")[0].trim().split(/\s+/u).filter(Boolean);
    if (!tokens.length) continue;
    const [address, prefix] = tokens[0].split("/");
    const bits = Number(prefix);
    if (isIP(address) !== 4 || !Number.isInteger(bits) || bits < 0 || bits > 32) {
      invalid.push(tokens[0]);
      continue;
    }
    valid.push(tokens[0]);
    for (let index = 1; index < tokens.length; index += 1) {
      if (["label", "dev", "scope", "broadcast", "preferred_lft"].includes(tokens[index])) {
        index += 1;
        if (!tokens[index]) invalid.push(tokens[0]);
      } else if (tokens[index] !== "notrack") invalid.push(tokens[0]);
    }
  }
  if (valid.length === 0) invalid.push("missing");
  return { valid, invalid };
}
