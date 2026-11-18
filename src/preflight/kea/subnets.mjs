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
      if (typeof pool.pool !== "string" || !validPool(pool.pool, version))
        errors.push(`subnet${version} pool must define a start and end address`);
  }
  return errors;
}

function validPool(pool, version) {
  if (pool.includes("-")) {
    const [start, end] = pool.split("-").map((address) => address.trim());
    return isIP(start) === Number(version) && isIP(end) === Number(version);
  }
  const [address, prefix, extra] = pool.split("/");
  const bits = Number(prefix);
  return (
    !extra &&
    isIP(address) === Number(version) &&
    Number.isInteger(bits) &&
    bits >= 0 &&
    bits <= (version === "4" ? 32 : 128)
  );
}
