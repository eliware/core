import parseInstances from "./keepalived/instances.mjs";

export default function validateKeepalived(left, right, leftText = "", rightText = "") {
  const first = parseInstances(leftText);
  const second = parseInstances(rightText);
  if (!first || !second) return ["Both repos need parsable Keepalived VRRP instances."];
  const errors = [];
  if (first.size !== second.size) errors.push("Keepalived VRRP instance sets must match.");
  for (const [name, a] of first) {
    if (a.invalidVips.length) errors.push(`Keepalived ${name} has an invalid virtual address.`);
    const b = second.get(name);
    if (!b) {
      errors.push(`Keepalived partner is missing ${name}.`);
      continue;
    }
    if (b.invalidVips.length) errors.push(`Keepalived ${name} has an invalid virtual address.`);
    if (a.id !== b.id || JSON.stringify(a.vips) !== JSON.stringify(b.vips)) {
      errors.push(`Keepalived ${name} must use matching VRIDs and virtual addresses.`);
    }
    if (a.source !== b.peer || b.source !== a.peer) {
      errors.push(`Keepalived ${name} peer addresses must be reciprocal.`);
    }
    if (!([a.state, b.state].includes("MASTER") && [a.state, b.state].includes("BACKUP"))) {
      errors.push(`Keepalived ${name} must have one MASTER and one BACKUP.`);
    }
    const master = a.state === "MASTER" ? a.priority : b.priority;
    const backup = a.state === "BACKUP" ? a.priority : b.priority;
    if (!(master > backup)) errors.push(`Keepalived ${name} MASTER priority must be higher.`);
  }
  if (left.routerId === right.routerId) errors.push("Keepalived router IDs must differ.");
  return errors;
}
