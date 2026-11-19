import isValidServerDirective from "./server/directive.mjs";
import isValidBindDirective from "./bind-directive.mjs";

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
      const bind = value.match(/^bind\s+(\S+)/u);
      if (bind && isValidBindDirective(value)) state.bound = true;
      if (/^bind(?:\s|$)/u.test(value) && !isValidBindDirective(value))
        errors.push(`FAIL ${file}:${directiveLine}: bind needs a valid address and port.`);
      if (/^server\s+/u.test(value) && isValidServerDirective(value)) state.serverCount += 1;
      const reference = value.match(/^(?:default_backend|use_backend)\s+(\S+)/u);
      if (reference) references.push(reference[1]);
      if (/^server\s+/u.test(value) && !isValidServerDirective(value))
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
