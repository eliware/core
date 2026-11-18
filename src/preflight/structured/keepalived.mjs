import isBalanced from "./balanced.mjs";
import parseInstances from "../../pair/keepalived/instances.mjs";

export default function validateKeepalived(file, text, files) {
  const errors = [];
  if (!isBalanced(text)) errors.push(`FAIL ${file}: configuration blocks are not balanced.`);
  const blocks = [...text.matchAll(/vrrp_instance\s+(\S+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gu)];
  if (blocks.length === 0) errors.push(`FAIL ${file}: no VRRP instances are defined.`);
  for (const [name, instance] of parseInstances(text) ?? [])
    if (instance.invalidVips.length)
      errors.push(`FAIL ${file}: ${name} has an invalid virtual address.`);
  validateDeclaredScriptPaths(file, text, files, errors);
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
    validateScriptPaths(file, body, files, errors);
    validateTrackedScripts(file, body, text, errors);
  }
  return errors;
}

function validateDeclaredScriptPaths(file, text, files, errors) {
  for (const path of textScripts(text)) {
    const local = resolveLocalScript(path);
    if (local && !files.includes(local))
      errors.push(`FAIL ${file}: referenced ${local} script is missing.`);
  }
}

function validateScriptPaths(file, body, files, errors) {
  const paths = [...body.matchAll(/\bnotify(?:_master|_backup|_fault|_stop)?\s+([^\s{}]+)/gu)].map(
    (match) => match[1],
  );
  for (const path of paths) {
    const local = resolveLocalScript(path);
    if (local && !files.includes(local))
      errors.push(`FAIL ${file}: referenced ${local} script is missing.`);
  }
}

function validateTrackedScripts(file, body, text, errors) {
  for (const track of body.matchAll(/\btrack_script\s*\{([^{}]*)\}/gu)) {
    const names = track[1]
      .split(/\r?\n/u)
      .map((line) => line.trim().split(/\s+/u)[0])
      .filter(Boolean);
    for (const name of names) {
      if (!new RegExp(`\\bvrrp_script\\s+${escapeRegExp(name)}\\s*\\{`, "u").test(text))
        errors.push(`FAIL ${file}: tracked script ${name} is not defined.`);
    }
  }
}

function textScripts(body) {
  const scripts = [];
  for (const [, , contents] of body.matchAll(/\bvrrp_script\s+(\S+)\s*\{([^{}]*?)\}/gu)) {
    const script = contents.match(/\bscript\s+([^\s{}]+)/u)?.[1];
    if (script) scripts.push(script.replace(/^['"]|['"]$/gu, ""));
  }
  return scripts;
}

function resolveLocalScript(path) {
  const managed = path.match(/^\/eliware\/[^/]+\/(.+)$/u)?.[1];
  if (managed) return managed;
  if (path.startsWith("/etc/keepalived/")) return `etc/keepalived/${path.split("/").at(-1)}`;
  return undefined;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
