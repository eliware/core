import validateFrrPair from "./frr.mjs";
import validateKea from "./kea.mjs";
import validateKeepalived from "./keepalived.mjs";
import validateNetworkPair from "./network.mjs";

export default function validatePair(leftName, rightName, leftFiles, rightFiles) {
  if (![leftName, rightName].includes("core1") || ![leftName, rightName].includes("core2")) {
    return { errors: ["Compare requires one @eliware/core1 repo and one @eliware/core2 repo."] };
  }
  const filesByName = new Map([
    [leftName, leftFiles],
    [rightName, rightFiles],
  ]);
  const core1Files = filesByName.get("core1");
  const core2Files = filesByName.get("core2");
  const frr = validateFrrPair(
    core1Files.get("etc/frr/frr.conf"),
    core2Files.get("etc/frr/frr.conf"),
  );
  if (!frr.core1 || !frr.core2) return { errors: frr.errors };

  const errors = [...frr.errors];
  errors.push(...validateKea("core1", frr.core1, core1Files.get("etc/kea/kea-dhcp4.conf")));
  errors.push(...validateKea("core2", frr.core2, core2Files.get("etc/kea/kea-dhcp4.conf")));
  errors.push(
    ...validateKeepalived(
      frr.core1,
      frr.core2,
      core1Files.get("etc/keepalived/keepalived.conf"),
      core2Files.get("etc/keepalived/keepalived.conf"),
    ),
  );
  errors.push(
    ...validateNetworkPair(
      frr.core1,
      frr.core2,
      core1Files.get("etc/conntrackd/conntrackd.conf"),
      core2Files.get("etc/conntrackd/conntrackd.conf"),
      core1Files.get("scripts/frr-connected-prefix.sh"),
      core2Files.get("scripts/frr-connected-prefix.sh"),
    ),
  );
  return {
    errors,
    nodes: new Map([
      ["core1", frr.core1],
      ["core2", frr.core2],
    ]),
  };
}
