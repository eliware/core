import { isIP } from "node:net";

export default function validateSubnets(subnets, version) {
  const errors = [];
  const ids = new Set();
  for (const subnet of subnets) {
    if (!Number.isInteger(subnet.id) || subnet.id < 1 || ids.has(subnet.id))
      errors.push(`subnet${version} IDs must be unique positive integers`);
    ids.add(subnet.id);
    const [address, prefix, extra] = String(subnet.subnet ?? "").split("/");
    const bits = Number(prefix);
    if (
      extra ||
      isIP(address) !== Number(version) ||
      !Number.isInteger(bits) ||
      bits < 0 ||
      bits > (version === "4" ? 32 : 128)
    )
      errors.push(`subnet${version} has an invalid network prefix`);
    if (subnet.pools && !Array.isArray(subnet.pools))
      errors.push(`subnet${version} pools must be an array`);
    for (const pool of Array.isArray(subnet.pools) ? subnet.pools : [])
      if (typeof pool.pool !== "string" || !validPool(pool.pool, version, subnet.subnet))
        errors.push(`subnet${version} pool must define a start and end address`);
  }
  return errors;
}

function validPool(pool, version, subnet) {
  const network = networkBounds(subnet, version);
  if (!network) return false;
  let bounds;
  if (pool.includes("-")) {
    const [start, end] = pool.split("-").map((address) => address.trim());
    if (isIP(start) !== Number(version) || isIP(end) !== Number(version)) return false;
    const first = addressValue(start, version);
    const last = addressValue(end, version);
    if (first > last) return false;
    bounds = [first, last];
  } else {
    bounds = networkBounds(pool, version);
    if (!bounds) return false;
  }
  return bounds[0] >= network[0] && bounds[1] <= network[1];
}

function networkBounds(cidr, version) {
  const [address, prefix, extra] = String(cidr ?? "").split("/");
  const bits = Number(prefix);
  const totalBits = version === "4" ? 32 : 128;
  if (
    extra ||
    isIP(address) !== Number(version) ||
    !Number.isInteger(bits) ||
    bits < 0 ||
    bits > totalBits
  )
    return null;
  const value = addressValue(address, version);
  const hostBits = BigInt(totalBits - bits);
  const hostMask = (1n << hostBits) - 1n;
  const start = (value >> hostBits) << hostBits;
  return [start, start | hostMask];
}

function addressValue(address, version) {
  if (version === "4")
    return address.split(".").reduce((value, part) => (value << 8n) | BigInt(part), 0n);
  let normalized = address;
  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    const ipv4 = normalized
      .slice(lastColon + 1)
      .split(".")
      .map(Number);
    const groups = [
      ((ipv4[0] << 8) | ipv4[1]).toString(16),
      ((ipv4[2] << 8) | ipv4[3]).toString(16),
    ];
    normalized = `${normalized.slice(0, lastColon + 1)}${groups.join(":")}`;
  }
  const parts = normalized.split("::");
  const left = parts[0];
  const right = parts[1] ?? "";
  const leftGroups = left ? left.split(":") : [];
  const rightGroups = right ? right.split(":") : [];
  const zeroCount = 8 - leftGroups.length - rightGroups.length;
  const groups = normalized.includes("::")
    ? [...leftGroups, ...Array(zeroCount).fill("0"), ...rightGroups]
    : leftGroups;
  return groups.reduce((value, group) => (value << 16n) | BigInt(`0x${group}`), 0n);
}
