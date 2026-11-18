import validateSubnets from "./kea/subnets.mjs";

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
