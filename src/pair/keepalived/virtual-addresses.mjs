import { isIP } from "node:net";

export default function parseVirtualAddresses(body) {
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
  return { valid: valid.sort(), invalid };
}
