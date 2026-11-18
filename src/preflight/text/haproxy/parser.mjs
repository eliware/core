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

export default function parseHaproxy(file, text) {
  const errors = [];
  const sections = new Map();
  const references = [];
  let kind = "";
  let name = "";
  let bound = false;
  let serverCount = 0;
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    const value = line.replace(/#.*$/u, "").trim();
    if (!value) continue;
    const heading = value.match(/^(global|defaults|frontend|backend|listen)\s*(.*)$/u);
    if (heading) {
      if (kind) sections.set(`${kind}:${name}`, { bound, serverCount });
      kind = heading[1];
      name = heading[2] || kind;
      bound = false;
      serverCount = 0;
      if (["frontend", "backend", "listen"].includes(kind) && !heading[2])
        errors.push(`FAIL ${file}:${index + 1}: ${kind} needs a name.`);
      if (sections.has(`${kind}:${name}`))
        errors.push(`FAIL ${file}:${index + 1}: duplicate ${kind} ${name}.`);
      continue;
    }
    if (!kind) errors.push(`FAIL ${file}:${index + 1}: setting appears before a section.`);
    else if (!allowed[kind].has(value.split(/\s+/u)[0]))
      errors.push(`FAIL ${file}:${index + 1}: unknown ${kind} directive.`);
    if (/^bind\s+\S+/u.test(value)) bound = true;
    if (/^server\s+\S+\s+\S+/u.test(value)) serverCount += 1;
    if (/^(?:default_backend|use_backend)\s+(\S+)/u.test(value))
      references.push(value.match(/^(?:default_backend|use_backend)\s+(\S+)/u)[1]);
    if (/^server\s+/u.test(value) && !/^server\s+\S+\s+(?:\S+:\d+|unix@\S+)/u.test(value))
      errors.push(`FAIL ${file}:${index + 1}: server needs a valid address and port.`);
  }
  if (kind) sections.set(`${kind}:${name}`, { bound, serverCount });
  return { errors, sections, references };
}
