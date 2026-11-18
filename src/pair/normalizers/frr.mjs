function replaceToken(text, token, replacement) {
  if (!token) return text;
  const boundary = new RegExp(`(?<![\\d.])${escapeRegex(token)}(?![\\d.])`, "gu");
  return text.replace(boundary, replacement);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export default function normalizeFrr(path, text, node) {
  if (path !== "etc/frr/frr.conf") return text;
  let normalized = text.replace(/^hostname\s+\S+$/mu, "hostname <router>");
  normalized = normalized.replace(/^router bgp\s+\d+$/gmu, "router bgp <local-as>");
  normalized = normalized.replace(/^\s+bgp router-id\s+\S+$/gmu, " bgp router-id <local-address>");
  normalized = replaceToken(normalized, node?.peer?.ip, "<peer-address>");
  normalized = normalized.replace(/(neighbor <peer-address> remote-as )\d+/gu, "$1<peer-as>");
  return normalized.replace(/(\bweight\s+)\d+/gu, "$1<ha-weight>");
}
