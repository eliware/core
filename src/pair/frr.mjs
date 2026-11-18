export default function validateFrrPair(core1Text = "", core2Text = "") {
  const core1 = readFrr(core1Text);
  const core2 = readFrr(core2Text);
  if (!core1 || !core2) {
    return { errors: ["Both repos need a parsable etc/frr/frr.conf file."] };
  }
  const errors = [];
  checkNode(core1, "core1", errors);
  checkNode(core2, "core2", errors);
  if (core1.peer.ip !== core2.routerId || core2.peer.ip !== core1.routerId) {
    errors.push("FRR core peer addresses must point to the partner router ID in both repos.");
  }
  if (core1.peer.asn !== core2.asn || core2.peer.asn !== core1.asn) {
    errors.push("FRR core peer AS numbers must point to the partner router AS in both repos.");
  }
  checkWeights(core1, core2, errors);
  return { core1, core2, errors };
}

function readFrr(text) {
  const hostname = text.match(/^hostname\s+(\S+)/mu)?.[1];
  const asn = Number(text.match(/^router bgp\s+(\d+)/mu)?.[1]);
  const routerId = text.match(/^\s+bgp router-id\s+(\S+)/mu)?.[1];
  const peerIp = text.match(/^\s*neighbor\s+(\S+)\s+description core peer\s*$/mu)?.[1];
  const peerAsn = text.match(
    new RegExp(`^\\s*neighbor\\s+${escapeRegex(peerIp)}\\s+remote-as\\s+(\\d+)`, "mu"),
  )?.[1];
  if (!hostname || !Number.isInteger(asn) || !routerId || !peerIp || !peerAsn) return null;
  const weights = new Map(
    [...text.matchAll(/^\s*neighbor\s+(\S+)\s+weight\s+(\d+)\s*$/gmu)].map((item) => [
      item[1],
      Number(item[2]),
    ]),
  );
  const neighbors = new Set(
    [...text.matchAll(/^\s*neighbor\s+(\S+)\s+remote-as\s+\d+\s*$/gmu)].map((item) => item[1]),
  );
  return {
    hostname,
    asn,
    routerId,
    peer: { ip: peerIp, asn: Number(peerAsn) },
    weights,
    neighbors,
  };
}

function checkNode(node, name, errors) {
  if (!node.hostname.startsWith(`${name}.`)) errors.push(`FRR hostname must identify ${name}.`);
  if (node.peer.ip === node.routerId)
    errors.push(`FRR ${name} cannot use its own router ID as its peer.`);
  if (!node.weights.has(node.peer.ip))
    errors.push(`FRR ${name} must set a weight for its core peer.`);
  for (const weight of node.weights.values()) {
    if (!Number.isInteger(weight) || weight < 1 || weight > 65535) {
      errors.push(`FRR ${name} has a weight outside the valid range.`);
      break;
    }
  }
}

function checkWeights(core1, core2, errors) {
  const keys1 = [...core1.weights.keys()]
    .map((key) => (key === core1.peer.ip ? "@peer" : key))
    .sort();
  const keys2 = [...core2.weights.keys()]
    .map((key) => (key === core2.peer.ip ? "@peer" : key))
    .sort();
  if (JSON.stringify(keys1) !== JSON.stringify(keys2)) {
    errors.push("FRR route preference weights must cover the same neighbors on both routers.");
    return;
  }
  const values1 = [...core1.weights.values()].sort((a, b) => a - b);
  const values2 = [...core2.weights.values()].sort((a, b) => a - b);
  if (JSON.stringify(values1) !== JSON.stringify(values2)) {
    errors.push("FRR HA route preference weights must be reciprocal across the pair.");
  }
  const peers1 = [...core1.neighbors].map((key) => (key === core1.peer.ip ? "@peer" : key)).sort();
  const peers2 = [...core2.neighbors].map((key) => (key === core2.peer.ip ? "@peer" : key)).sort();
  if (JSON.stringify(peers1) !== JSON.stringify(peers2)) {
    errors.push("FRR neighbor sets must match across both routers.");
  }
}

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
