import { isIP } from "node:net";

const services = new Map([
  ["kea-dhcp4.conf", "Dhcp4"],
  ["kea-dhcp6.conf", "Dhcp6"],
  ["kea-dhcp-ddns.conf", "DhcpDdns"],
  ["kea-ctrl-agent.conf", "Control-agent"],
]);

export default function validateKea(file, config) {
  const section = services.get(file.split("/").at(-1));
  const body = config?.[section];
  if (!section || !body || Object.keys(config).length !== 1)
    return ["expected one matching Kea service object"];
  const errors = [];
  if (!Array.isArray(body.loggers) || body.loggers.length === 0)
    errors.push("loggers must be a nonempty array");
  if (section === "Dhcp4" || section === "Dhcp6") {
    const version = section.slice(-1);
    if (!Array.isArray(body[`subnet${version}`]) || body[`subnet${version}`].length === 0)
      errors.push(`subnet${version} must be a nonempty array`);
    if (!Array.isArray(body["interfaces-config"]?.interfaces))
      errors.push("interfaces-config.interfaces must be an array");
    if (!body["lease-database"]?.type) errors.push("lease-database.type is required");
    errors.push(...validateSubnets(body[`subnet${version}`] ?? [], version));
  }
  if (
    section === "DhcpDdns" &&
    (!Number.isInteger(body.port) || body.port < 1 || body.port > 65535)
  )
    errors.push("port must be between 1 and 65535");
  if (
    section === "Control-agent" &&
    (!Number.isInteger(body["http-port"]) ||
      body["http-port"] < 1 ||
      body["http-port"] > 65535 ||
      !body["control-sockets"])
  )
    errors.push("http-port and control-sockets are required and valid");
  return errors;
}

function validateSubnets(subnets, version) {
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
