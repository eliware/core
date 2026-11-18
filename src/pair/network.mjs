export default function validateNetworkPair(
  core1,
  core2,
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
    first.local !== core1.routerId ||
    first.peer !== core2.routerId ||
    second.local !== core2.routerId ||
    second.peer !== core1.routerId
  ) {
    errors.push("Conntrackd peer addresses must match the reciprocal FRR router IDs.");
  }
  for (const [name, node, script] of [
    ["core1", core1, script1],
    ["core2", core2, script2],
  ]) {
    const address = script.match(/^address="([^"]+)"/mu)?.[1];
    if (!address?.startsWith(`${node.routerId}/`)) {
      errors.push(`FRR connected prefix on ${name} must use its local router ID.`);
    }
  }
  return errors;
}

function parseConntrack(text) {
  const local = text.match(/^\s*IPv4_address\s+(\S+)/mu)?.[1];
  const peer = text.match(/^\s*IPv4_Destination_Address\s+(\S+)/mu)?.[1];
  return local && peer ? { local, peer } : null;
}
