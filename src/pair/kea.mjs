import { parse as parseJsonc } from "jsonc-parser";

export default function validateKea(node, partnerNode, text = "") {
  try {
    const config = parseJsonc(text);
    const ha = config.Dhcp4["hooks-libraries"].find(
      (item) => item.parameters?.["high-availability"],
    ).parameters["high-availability"][0];
    const self = node.hostname;
    const peers = new Map(ha.peers.map((peer) => [peer.name, peer]));
    const errors = [];
    if (ha["this-server-name"] !== self)
      errors.push("Kea must name its FRR hostname as the local HA server.");
    const roles = ha.peers.map((peer) => peer.role).sort();
    if (ha.peers.length !== 2 || roles[0] !== "primary" || roles[1] !== "secondary")
      errors.push("Kea HA peers must define one primary and one secondary server.");
    if (
      peers.size !== 2 ||
      !peers.has(self) ||
      !peers.has(partnerNode.hostname) ||
      self === partnerNode.hostname
    )
      errors.push("Kea HA peers must name the local and partner servers exactly once.");
    if (peers.get(self)?.url !== `http://${node.routerId}:8000/`) {
      errors.push("Kea local HA URL must use its FRR router ID.");
    }
    if (peers.get(partnerNode.hostname)?.url !== `http://${partnerNode.routerId}:8000/`) {
      errors.push("Kea partner HA URL must use the partner FRR router ID.");
    }
    return errors;
  } catch {
    return ["Kea DHCPv4 HA configuration is missing or invalid."];
  }
}
