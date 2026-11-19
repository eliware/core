import { isIP } from "node:net";

const allowed = {
  global: new Set([
    "log",
    "maxconn",
    "stats",
    "user",
    "group",
    "daemon",
    "chroot",
    "nbproc",
    "nbthread",
  ]),
  defaults: new Set([
    "log",
    "mode",
    "option",
    "timeout",
    "retries",
    "balance",
    "maxconn",
    "default-server",
  ]),
  frontend: new Set([
    "bind",
    "mode",
    "option",
    "timeout",
    "http-request",
    "http-response",
    "default_backend",
    "use_backend",
    "acl",
    "redirect",
    "capture",
    "compression",
    "tcp-request",
  ]),
  backend: new Set([
    "mode",
    "option",
    "timeout",
    "balance",
    "server",
    "default-server",
    "stick-table",
    "stick",
    "http-request",
    "http-response",
    "tcp-check",
  ]),
  listen: new Set([
    "bind",
    "mode",
    "option",
    "timeout",
    "balance",
    "server",
    "default-server",
    "stats",
    "acl",
    "http-request",
    "http-response",
  ]),
};

export default function validateHaproxy(file, { sections: parsedSections }) {
  const errors = [];
  const sections = new Map();
  const references = [];
  for (const section of parsedSections) {
    const { kind, name, line, directives } = section;
    const sectionName = name || kind;
    const key = `${kind}:${sectionName}`;
    if (["frontend", "backend", "listen"].includes(kind) && !name)
      errors.push(`FAIL ${file}:${line}: ${kind} needs a name.`);
    if (sections.has(key)) errors.push(`FAIL ${file}:${line}: duplicate ${kind} ${sectionName}.`);
    const state = { bound: false, serverCount: 0 };
    for (const directive of directives) {
      const { value, line: directiveLine } = directive;
      const nameOfDirective = value.split(/\s+/u)[0];
      if (!allowed[kind].has(nameOfDirective))
        errors.push(`FAIL ${file}:${directiveLine}: unknown ${kind} directive.`);
      if (/^bind\s+\S+(?:\s|$)/u.test(value)) state.bound = true;
      const server = value.match(/^server\s+\S+\s+(\S+)/u);
      if (server && isValidServerAddress(server[1])) state.serverCount += 1;
      const reference = value.match(/^(?:default_backend|use_backend)\s+(\S+)/u);
      if (reference) references.push(reference[1]);
      if (/^server\s+/u.test(value) && (!server || !isValidServerAddress(server[1])))
        errors.push(`FAIL ${file}:${directiveLine}: server needs a valid address and port.`);
    }
    sections.set(key, state);
  }
  if (!sections.has("global:global") || !sections.has("defaults:defaults"))
    errors.push(`FAIL ${file}: global and defaults sections are required.`);
  for (const [key, state] of sections) {
    if (key.startsWith("frontend:") && !state.bound)
      errors.push(`FAIL ${file}: ${key.slice(9)} needs a bind directive.`);
    if (key.startsWith("backend:") && state.serverCount === 0)
      errors.push(`FAIL ${file}: ${key.slice(8)} needs a server directive.`);
  }
  for (const backend of references)
    if (!sections.has(`backend:${backend}`) && !sections.has(`listen:${backend}`))
      errors.push(`FAIL ${file}: backend ${backend} is not defined.`);
  return errors;
}

function isValidServerAddress(address) {
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
