import parseFrr from "./frr-parser.mjs";
import validateFrrNode from "./frr/node.mjs";

export default function validateFrrPair(core1Text = "", core2Text = "") {
  const core1 = parseFrr(core1Text);
  const core2 = parseFrr(core2Text);
  if (!core1 || !core2) {
    return { errors: ["Both repos need a parsable etc/frr/frr.conf file."] };
  }
  const errors = [...validateFrrNode(core1, "core1"), ...validateFrrNode(core2, "core2")];
  if (core1.peer.ip !== core2.routerId || core2.peer.ip !== core1.routerId) {
    errors.push("FRR core peer addresses must point to the partner router ID in both repos.");
  }
  if (core1.peer.asn !== core2.asn || core2.peer.asn !== core1.asn) {
    errors.push("FRR core peer AS numbers must point to the partner router AS in both repos.");
  }
  checkWeights(core1, core2, errors);
  return { core1, core2, errors };
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
  const weights1 = normalizeWeights(core1);
  const weights2 = normalizeWeights(core2);
  if (JSON.stringify(weights1) !== JSON.stringify(weights2)) {
    errors.push("FRR route preference weights must match per neighbor across both routers.");
  }
  const peers1 = [...core1.neighbors].map((key) => (key === core1.peer.ip ? "@peer" : key)).sort();
  const peers2 = [...core2.neighbors].map((key) => (key === core2.peer.ip ? "@peer" : key)).sort();
  if (JSON.stringify(peers1) !== JSON.stringify(peers2)) {
    errors.push("FRR neighbor sets must match across both routers.");
  }
}

function normalizeWeights(node) {
  return [...node.weights.entries()]
    .map(([neighbor, weight]) => [neighbor === node.peer.ip ? "@peer" : neighbor, weight])
    .sort(([left], [right]) => left.localeCompare(right));
}
