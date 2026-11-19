import { isIP } from "node:net";

export default function isValidServerAddress(address, { allowWildcard = false } = {}) {
  if (/^unix@\S+$/u.test(address)) return true;
  if (allowWildcard && /^(?:\*|):\d+$/u.test(address))
    return validPort(address.slice(address.lastIndexOf(":") + 1));
  if (allowWildcard && /^:::\d+$/u.test(address))
    return validPort(address.slice(address.lastIndexOf(":") + 1));
  const separator = address.lastIndexOf(":");
  if (separator < 1) return false;
  const port = address.slice(separator + 1);
  if (!validPort(port)) return false;
  let host = address.slice(0, separator);
  const family = host.startsWith("ipv4@") ? 4 : host.startsWith("ipv6@") ? 6 : undefined;
  if (family) host = host.slice(5);
  if (host.startsWith("[") && host.endsWith("]"))
    return family !== 4 && isIP(host.slice(1, -1)) === 6;
  if (host.includes(":")) return false;
  const version = isIP(host);
  if (version) return family === undefined || family === version;
  if (family) return false;
  return isValidHostname(host);
}

function validPort(port) {
  return /^\d+$/u.test(port) && Number(port) >= 1 && Number(port) <= 65535;
}

function isValidHostname(host) {
  const name = host.endsWith(".") ? host.slice(0, -1) : host;
  return (
    name.length > 0 &&
    name.length <= 253 &&
    name
      .split(".")
      .every(
        (label) => label.length <= 63 && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/u.test(label),
      )
  );
}
