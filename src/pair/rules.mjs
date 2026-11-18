import validateFrrPair from "./frr.mjs";
import validateKea from "./kea.mjs";
import validateKeepalived from "./keepalived.mjs";
import validateNetworkPair from "./network.mjs";

export default function validatePair(leftName, rightName, leftFiles, rightFiles) {
  if (!leftName || !rightName || leftName === rightName) {
    return { errors: ["Compare requires two repositories with different package names."] };
  }
  const left = leftFiles;
  const right = rightFiles;
  const frr = validateFrrPair(left.get("etc/frr/frr.conf"), right.get("etc/frr/frr.conf"));
  if (!frr.left || !frr.right) return { errors: frr.errors };

  const errors = [...frr.errors];
  errors.push(...validateKea(frr.left, frr.right, left.get("etc/kea/kea-dhcp4.conf")));
  errors.push(...validateKea(frr.right, frr.left, right.get("etc/kea/kea-dhcp4.conf")));
  errors.push(
    ...validateKeepalived(
      frr.left,
      frr.right,
      left.get("etc/keepalived/keepalived.conf"),
      right.get("etc/keepalived/keepalived.conf"),
    ),
  );
  errors.push(
    ...validateNetworkPair(
      frr.left,
      frr.right,
      left.get("etc/conntrackd/conntrackd.conf"),
      right.get("etc/conntrackd/conntrackd.conf"),
      left.get("scripts/frr-connected-prefix.sh"),
      right.get("scripts/frr-connected-prefix.sh"),
    ),
  );
  return {
    errors,
    nodes: new Map([
      [leftName, frr.left],
      [rightName, frr.right],
    ]),
  };
}
