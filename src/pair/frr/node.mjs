export default function validateFrrNode(node, name) {
  const errors = [];
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
  return errors;
}
