import isBalanced from "./balanced.mjs";

export default function validateKeepalived(file, text, files) {
  const errors = [];
  if (!isBalanced(text)) errors.push(`FAIL ${file}: configuration blocks are not balanced.`);
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
