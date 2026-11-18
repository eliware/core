export default function validateFrrNode(node) {
  const errors = [];
  if (node.peer.ip === node.routerId) errors.push("FRR cannot use its own router ID as its peer.");
  if (!node.weights.has(node.peer.ip)) errors.push("FRR must set a weight for its peer.");
  for (const weight of node.weights.values()) {
    if (!Number.isInteger(weight) || weight < 1 || weight > 65535) {
      errors.push("FRR has a weight outside the valid range.");
      break;
    }
  }
  return errors;
}
