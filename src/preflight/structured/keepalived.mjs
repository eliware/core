import isBalanced from "./balanced.mjs";
import parseInstances from "../../pair/keepalived/instances.mjs";
import validateKeepalivedScripts from "./keepalived-scripts.mjs";
import parseVirtualAddresses from "../../pair/keepalived/virtual-addresses.mjs";

export default function validateKeepalived(file, text, files) {
  const errors = [];
  if (!isBalanced(text)) errors.push(`FAIL ${file}: configuration blocks are not balanced.`);
  const instances = parseInstances(text);
  if (!instances) errors.push(`FAIL ${file}: no VRRP instances are defined.`);
  errors.push(...validateKeepalivedScripts(file, text, files));
  for (const [name, instance] of instances ?? []) {
    if (parseVirtualAddresses(instance.body).invalid.length)
      errors.push(`FAIL ${file}: ${name} has an invalid virtual address.`);
    const body = instance.validationBody;
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
  }
  return errors;
}
