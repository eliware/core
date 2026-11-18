export default function normalizeKeepalived(path, text) {
  if (path !== "etc/keepalived/keepalived.conf") return text;
  let normalized = text.replace(/^\s*router_id\s+\S+$/gmu, "    router_id <router>");
  normalized = normalized.replace(/^\s*state\s+(MASTER|BACKUP)$/gmu, "    state <role>");
  normalized = normalized.replace(/^\s*priority\s+\d+$/gmu, "    priority <priority>");
  normalized = normalized.replace(
    /^\s*unicast_src_ip\s+\S+$/gmu,
    "    unicast_src_ip <local-address>",
  );
  return normalized.replace(/(unicast_peer\s*\{\s*)\S+/gu, "$1<peer-address>");
}
