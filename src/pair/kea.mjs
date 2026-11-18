import { parse as parseJsonc } from "jsonc-parser";

export default function validateKea(name, node, text = "") {
  try {
    const config = parseJsonc(text);
    const ha = config.Dhcp4["hooks-libraries"].find(
      (item) => item.parameters?.["high-availability"],
    ).parameters["high-availability"][0];
    const self = `${name}.purinton.us`;
    const peers = new Map(ha.peers.map((peer) => [peer.name, peer]));
    const errors = [];
    if (ha["this-server-name"] !== self)
      errors.push(`Kea ${name} must name itself as the local HA server.`);
    for (const [peerName, role] of [
      ["core1.purinton.us", "primary"],
      ["core2.purinton.us", "secondary"],
    ]) {
      const peer = peers.get(peerName);
      if (!peer || peer.role !== role)
        errors.push(`Kea HA peers must define ${peerName} as ${role}.`);
    }
    if (peers.get(self)?.url !== `http://${node.routerId}:8000/`) {
      errors.push(`Kea ${name} HA URL must use its FRR router ID.`);
    }
    return errors;
  } catch {
    return [`Kea ${name} DHCPv4 HA configuration is missing or invalid.`];
  }
}
