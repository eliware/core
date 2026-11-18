export default function validateNetworkPair(
  left,
  right,
  conntrack1 = "",
  conntrack2 = "",
  script1 = "",
  script2 = "",
) {
  const first = parseConntrack(conntrack1);
  const second = parseConntrack(conntrack2);
  const errors = [];
  if (
    !first ||
    !second ||
    first.local !== left.routerId ||
    first.peer !== right.routerId ||
    second.local !== right.routerId ||
    second.peer !== left.routerId
  ) {
    errors.push("Conntrackd peer addresses must match the reciprocal FRR router IDs.");
  }
  for (const [name, node, script] of [
    ["first", left, script1],
    ["second", right, script2],
  ]) {
    const address = script.match(/^address="([^"]+)"/mu)?.[1];
    if (!address?.startsWith(`${node.routerId}/`)) {
      errors.push(`FRR connected prefix on the ${name} repository must use its local router ID.`);
    }
  }
  return errors;
}

function parseConntrack(text) {
  const local = text.match(/^\s*IPv4_address\s+(\S+)/mu)?.[1];
  const peer = text.match(/^\s*IPv4_Destination_Address\s+(\S+)/mu)?.[1];
  return local && peer ? { local, peer } : null;
}
