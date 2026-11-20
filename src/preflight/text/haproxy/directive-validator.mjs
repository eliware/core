import isValidBindDirective from "./bind-directive.mjs";
import isValidServerDirective from "./server/directive.mjs";

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

export default function validateDirectives(file, kind, directives) {
  const result = { errors: [], bound: false, serverCount: 0, references: [] };
  for (const { value, line } of directives) {
    const directiveName = value.split(/\s+/u)[0];
    if (!allowed[kind].has(directiveName))
      result.errors.push(`FAIL ${file}:${line}: unknown ${kind} directive.`);
    if (/^bind\s+/u.test(value) && isValidBindDirective(value)) result.bound = true;
    if (/^bind(?:\s|$)/u.test(value) && !isValidBindDirective(value))
      result.errors.push(`FAIL ${file}:${line}: bind needs a valid address and port.`);
    if (/^server\s+/u.test(value) && isValidServerDirective(value)) result.serverCount += 1;
    const reference = value.match(/^(?:default_backend|use_backend)\s+(\S+)/u);
    if (reference) result.references.push(reference[1]);
    if (/^server\s+/u.test(value) && !isValidServerDirective(value))
      result.errors.push(`FAIL ${file}:${line}: server needs a valid address and port.`);
  }
  return result;
}
