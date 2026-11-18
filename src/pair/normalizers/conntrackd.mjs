export default function normalizeConntrackd(path, text) {
  if (path !== "etc/conntrackd/conntrackd.conf") return text;
  let normalized = text.replace(/(^\s*IPv4_address\s+)\S+/gmu, "$1<local-address>");
  return normalized.replace(/(^\s*IPv4_Destination_Address\s+)\S+/gmu, "$1<peer-address>");
}
