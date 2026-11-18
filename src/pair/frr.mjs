import parseFrr from "./frr-parser.mjs";
import validateFrrNode from "./frr/node.mjs";

export default function validateFrrPair(leftText = "", rightText = "") {
  const left = parseFrr(leftText);
  const right = parseFrr(rightText);
  if (!left || !right) {
    return { errors: ["Both repos need a parsable etc/frr/frr.conf file."] };
  }
  const errors = [...validateFrrNode(left), ...validateFrrNode(right)];
  if (left.peer.ip !== right.routerId || right.peer.ip !== left.routerId) {
    errors.push("FRR peer addresses must point to the partner router ID in both repos.");
  }
  if (left.peer.asn !== right.asn || right.peer.asn !== left.asn) {
    errors.push("FRR peer AS numbers must point to the partner router AS in both repos.");
  }
  checkWeights(left, right, errors);
  return { left, right, errors };
}

function checkWeights(left, right, errors) {
  const keys1 = [...left.weights.keys()]
    .map((key) => (key === left.peer.ip ? "@peer" : key))
    .sort();
  const keys2 = [...right.weights.keys()]
    .map((key) => (key === right.peer.ip ? "@peer" : key))
    .sort();
  if (JSON.stringify(keys1) !== JSON.stringify(keys2)) {
    errors.push("FRR route preference weights must cover the same neighbors on both routers.");
    return;
  }
  const peers1 = [...left.neighbors].map((key) => (key === left.peer.ip ? "@peer" : key)).sort();
  const peers2 = [...right.neighbors].map((key) => (key === right.peer.ip ? "@peer" : key)).sort();
  if (JSON.stringify(peers1) !== JSON.stringify(peers2)) {
    errors.push("FRR neighbor sets must match across both repositories.");
    return;
  }
  const external = keys1.filter((key) => key !== "@peer");
  const first = new Map(external.map((key) => [key, left.weights.get(key)]));
  const second = new Map(external.map((key) => [key, right.weights.get(key)]));
  if (!hasReciprocalPreferences(external, first, second)) {
    errors.push("FRR weight differences must express reciprocal high availability preferences.");
  }
}

function hasReciprocalPreferences(neighbors, first, second) {
  if (neighbors.every((neighbor) => first.get(neighbor) === second.get(neighbor))) return true;
  let distinct = false;
  for (let index = 0; index < neighbors.length; index += 1) {
    const neighbor = neighbors[index];
    if (first.get(neighbor) !== second.get(neighbor)) distinct = true;
    for (const other of neighbors.slice(index + 1)) {
      const firstOrder = Math.sign(first.get(neighbor) - first.get(other));
      const secondOrder = Math.sign(second.get(neighbor) - second.get(other));
      if (firstOrder !== -secondOrder) return false;
    }
  }
  return distinct && neighbors.length > 1;
}
