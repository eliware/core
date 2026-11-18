export default function validateKeepalived(core1, core2, core1Text = "", core2Text = "") {
  const first = parseInstances(core1Text);
  const second = parseInstances(core2Text);
  if (!first || !second) return ["Both repos need parsable Keepalived VRRP instances."];
  const errors = [];
  if (first.size !== second.size) errors.push("Keepalived VRRP instance sets must match.");
  for (const [name, a] of first) {
    const b = second.get(name);
    if (!b) {
      errors.push(`Keepalived partner is missing ${name}.`);
      continue;
    }
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
  if (core1.routerId === core2.routerId) errors.push("Keepalived router IDs must differ.");
  return errors;
}

function parseInstances(text) {
  const instances = new Map();
  const headers = [...text.matchAll(/vrrp_instance\s+(\S+)\s*\{/gu)];
  for (const header of headers) {
    let depth = 1;
    let end = header.index + header[0].length;
    while (depth > 0 && end < text.length) {
      if (text[end] === "{") depth += 1;
      if (text[end] === "}") depth -= 1;
      end += 1;
    }
    if (depth !== 0) return null;
    const body = text.slice(header.index + header[0].length, end - 1);
    const value = (pattern) => body.match(pattern)?.[1];
    const vips = body
      .match(/virtual_ipaddress\s*\{([^}]*)\}/u)?.[1]
      ?.split(/\s+/u)
      .filter((item) => /^\d+\.\d+\.\d+\.\d+\//u.test(item))
      .sort();
    instances.set(header[1], {
      id: value(/virtual_router_id\s+(\d+)/u),
      state: value(/state\s+(MASTER|BACKUP)/u),
      priority: Number(value(/priority\s+(\d+)/u)),
      source: value(/unicast_src_ip\s+(\S+)/u),
      peer: body.match(/unicast_peer\s*\{\s*(\S+)/u)?.[1],
      vips: vips ?? [],
    });
  }
  return instances.size > 0 ? instances : null;
}
