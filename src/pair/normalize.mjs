import { parse as parseJsonc } from "jsonc-parser";

export default function normalizePairFile(path, text, node) {
  let normalized = text.replaceAll("\r\n", "\n");
  normalized = normalized.replace(/\/eliware\/core[12](?=\/)/gu, "/eliware/core");

  if (path === "etc/frr/frr.conf") {
    normalized = normalized.replace(/^hostname\s+\S+$/mu, "hostname <router>");
    normalized = normalized.replace(/^router bgp\s+\d+$/gmu, "router bgp <local-as>");
    normalized = normalized.replace(
      /^\s+bgp router-id\s+\S+$/gmu,
      " bgp router-id <local-address>",
    );
    normalized = replaceToken(normalized, node.peer.ip, "<peer-address>");
    normalized = normalized.replace(/(neighbor <peer-address> remote-as )\d+/gu, "$1<peer-as>");
    normalized = normalized.replace(/(\bweight\s+)\d+/gu, "$1<ha-weight>");
  }

  if (path === "etc/kea/kea-dhcp4.conf") {
    const config = parseJsonc(normalized);
    const ha = config.Dhcp4["hooks-libraries"].find(
      (item) => item.parameters?.["high-availability"],
    ).parameters["high-availability"][0];
    ha["this-server-name"] = "<local-server>";
    normalized = JSON.stringify(config, null, 2);
  }

  if (path === "etc/keepalived/keepalived.conf") {
    normalized = normalized.replace(/^\s*router_id\s+\S+$/gmu, "    router_id <router>");
    normalized = normalized.replace(/^\s*state\s+(MASTER|BACKUP)$/gmu, "    state <role>");
    normalized = normalized.replace(/^\s*priority\s+\d+$/gmu, "    priority <priority>");
    normalized = normalized.replace(
      /^\s*unicast_src_ip\s+\S+$/gmu,
      "    unicast_src_ip <local-address>",
    );
    normalized = normalized.replace(/(unicast_peer\s*\{\s*)\S+/gu, "$1<peer-address>");
  }

  if (path === "etc/conntrackd/conntrackd.conf") {
    normalized = normalized.replace(/(^\s*IPv4_address\s+)\S+/gmu, "$1<local-address>");
    normalized = normalized.replace(/(^\s*IPv4_Destination_Address\s+)\S+/gmu, "$1<peer-address>");
  }

  if (path === "etc/sysconfig/ip6tables") {
    normalized = normalized.replace(
      /--ctstate\s+([A-Z,]+)/gu,
      (_all, states) => `--ctstate ${states.split(",").sort().join(",")}`,
    );
  }

  if (path === "scripts/frr-connected-prefix.sh") {
    normalized = normalized.replace(/^(address=")[^/]+(\/\d+")$/mu, "$1<local-address>$2");
  }
  return normalized;
}

function replaceToken(text, token, replacement) {
  if (!token) return text;
  const boundary = new RegExp(`(?<![\\d.])${escapeRegex(token)}(?![\\d.])`, "gu");
  return text.replace(boundary, replacement);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
