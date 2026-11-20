import parseInstances from "./keepalived/instances.mjs";
import validateKeepalivedPair from "./keepalived/pair-rules.mjs";

export default function validateKeepalived(left, right, leftText = "", rightText = "") {
  const first = parseInstances(leftText);
  const second = parseInstances(rightText);
  if (!first || !second) return ["Both repos need parsable Keepalived VRRP instances."];
  return validateKeepalivedPair(left, right, first, second);
}
