import { isIP } from "node:net";

export default function isValidServerAddress(address) {
  if (/^unix@\S+$/u.test(address)) return true;
  const separator = address.lastIndexOf(":");
  if (separator < 1) return false;
  const port = address.slice(separator + 1);
  if (!/^\d+$/u.test(port) || Number(port) < 1 || Number(port) > 65535) return false;
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
