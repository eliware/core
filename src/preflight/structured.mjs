import { resolve } from "node:path";

export default function validateStructured(file, text, files, root, readFile) {
  if (file.startsWith("etc/systemd/") && /\.(?:conf|service|timer)$/u.test(file))
    return validateSystemd(file, text, files);
  if (file === "etc/named.conf" || file === "etc/named.rfc1912.zones")
    return validateNamed(file, text, files, root, readFile);
  if (file === "etc/keepalived/keepalived.conf") return validateKeepalived(file, text, files);
  if (file === "etc/conntrackd/conntrackd.conf")
    return balanced(text, "{}") && /\bSync\s*\{/u.test(text) && /\bGeneral\s*\{/u.test(text)
      ? []
      : [`FAIL ${file}: Sync and General blocks must be balanced and present.`];
  return [];
}

function balanced(text, pair) {
  const [open, close] = pair;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (const char of text) {
    if (escaped) escaped = false;
    else if (char === "\\" && quote) escaped = true;
    else if (quote && char === quote) quote = "";
    else if (!quote && (char === '"' || char === "'")) quote = char;
    else if (!quote && char === open) depth += 1;
    else if (!quote && char === close && --depth < 0) return false;
  }
  return !quote && depth === 0;
}

function validateSystemd(file, text, files) {
  const errors = [];
  const sections = new Set();
  let section = "";
  const seen = new Set();
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    const value = line.trim();
    if (!value || value.startsWith("#") || value.startsWith(";")) continue;
    const heading = value.match(/^\[([A-Za-z]+)\]$/u);
    if (heading) {
      section = heading[1];
      sections.add(section);
      continue;
    }
    const setting = value.match(/^([A-Za-z][A-Za-z0-9]+)\s*=/u);
    if (!section || !setting)
      errors.push(`FAIL ${file}:${index + 1}: expected a section or key-value setting.`);
    else {
      const key = `${section}:${setting[1]}`;
      if (
        seen.has(key) &&
        ![
          "ExecStartPre",
          "ExecStartPost",
          "ExecReload",
          "Environment",
          "EnvironmentFile",
          "After",
          "Wants",
          "Requires",
          "Before",
          "PartOf",
          "WantedBy",
        ].includes(setting[1])
      )
        errors.push(`FAIL ${file}:${index + 1}: duplicate ${setting[1]} setting.`);
      seen.add(key);
      const command = value.match(
        /^Exec(?:Start|StartPre|StartPost|Reload)=\s*(?:\+|-|!|@|:|\|)*([^\s]+)/u,
      );
      if (command?.[1].startsWith("/eliware/core")) {
        const target = command[1].replace(/^\/eliware\/core[12]\//u, "");
        if (!files.includes(target))
          errors.push(`FAIL ${file}:${index + 1}: referenced ${target} file is missing.`);
      }
    }
  }
  if (file.includes(".d/")) {
    if (sections.size === 0) errors.push(`FAIL ${file}: a drop-in needs a unit section.`);
  } else if (!sections.has("Unit") || (!sections.has("Service") && !sections.has("Timer"))) {
    errors.push(`FAIL ${file}: a unit needs [Unit] and [Service] or [Timer] sections.`);
  }
  return errors;
}

function validateNamed(file, text, files, root, readFile) {
  const errors = [];
  if (!balanced(text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/[^\n]*/gu, ""), "{}"))
    errors.push(`FAIL ${file}: configuration blocks are not balanced.`);
  for (const match of text.matchAll(/\bfile\s+"([^"]+)"\s*;/gu)) {
    const reference = match[1];
    const local =
      reference.match(/^\/eliware\/core[12]\/(.+)$/u)?.[1] ??
      (reference.startsWith("zones/") ? `var/named/${reference}` : undefined);
    if (local && !files.includes(local))
      errors.push(`FAIL ${file}: referenced ${local} file is missing.`);
    else if (local) {
      try {
        readFile(resolve(root, local), "utf8");
      } catch {
        errors.push(`FAIL ${file}: referenced ${local} file cannot be read.`);
      }
    }
  }
  if (file === "etc/named.conf" && !/\boptions\s*\{/u.test(text))
    errors.push(`FAIL ${file}: options block is missing.`);
  return errors;
}

function validateKeepalived(file, text, files) {
  const errors = [];
  if (!balanced(text, "{}")) errors.push(`FAIL ${file}: configuration blocks are not balanced.`);
  const blocks = [...text.matchAll(/vrrp_instance\s+(\S+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gu)];
  if (blocks.length === 0) errors.push(`FAIL ${file}: no VRRP instances are defined.`);
  for (const [, name, body] of blocks) {
    for (const key of [
      "state",
      "interface",
      "virtual_router_id",
      "priority",
      "unicast_src_ip",
      "unicast_peer",
      "virtual_ipaddress",
    ]) {
      if (!new RegExp(`\\b${key}\\b`, "u").test(body))
        errors.push(`FAIL ${file}: ${name} is missing ${key}.`);
    }
    const priority = body.match(/\bpriority\s+(\d+)/u)?.[1];
    if (!priority || Number(priority) < 1 || Number(priority) > 255)
      errors.push(`FAIL ${file}: ${name} has an invalid priority.`);
    for (const script of body.matchAll(
      /\b(?:notify(?:_master|_backup|_fault|_stop)?|track_script)\s+(?:\{\s*)?([^\s}]+)/gu,
    )) {
      const path = script[1];
      const local =
        path.match(/^\/eliware\/core[12]\/(.+)$/u)?.[1] ??
        (path.startsWith("/etc/keepalived/")
          ? `etc/keepalived/${path.split("/").at(-1)}`
          : undefined);
      if (local && !files.includes(local))
        errors.push(`FAIL ${file}: referenced ${local} script is missing.`);
    }
  }
  return errors;
}
