import { isIP } from "node:net";

export default function parseVirtualAddresses(body) {
  const block = body.match(/virtual_ipaddress\s*\{([^}]*)\}/u);
  if (!block) return { valid: [], invalid: ["missing"] };
  const valid = [];
  const invalid = [];
  for (const line of block[1].split(/\r?\n/u)) {
    const tokens = stripComment(line).trim().split(/\s+/u).filter(Boolean);
    if (!tokens.length) continue;
    const [address, prefix] = tokens[0].split("/");
    const bits = Number(prefix);
    if (
      isIP(address) !== 4 ||
      !Number.isInteger(bits) ||
      bits < 0 ||
      bits > 32 ||
      !isUsableHostAddress(address, bits)
    ) {
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

function stripComment(line) {
  let quote;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) escaped = false;
    else if (quote && character === "\\") escaped = true;
    else if (quote && character === quote) quote = undefined;
    else if (!quote && (character === '"' || character === "'")) quote = character;
    else if (!quote && character === "#") return line.slice(0, index);
  }
  return line;
}

function isUsableHostAddress(address, prefix) {
  if (prefix >= 31) return true;
  const value = address.split(".").reduce((result, octet) => (result << 8n) | BigInt(octet), 0n);
  const hostBits = BigInt(32 - prefix);
  const blockSize = 1n << hostBits;
  const network = (value / blockSize) * blockSize;
  const broadcast = network + blockSize - 1n;
  return value !== network && value !== broadcast;
}
