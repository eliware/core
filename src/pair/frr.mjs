import parseFrr from "./frr-parser.mjs";
import validateFrrNode from "./frr/node.mjs";
import validateFrrWeights from "./frr/weights.mjs";

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
  errors.push(...validateFrrWeights(left, right));
  return { left, right, errors };
}
