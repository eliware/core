export default function extractInstanceFields(body, validationBody) {
  const value = (pattern, uniquePattern) => {
    const all = [...validationBody.matchAll(uniquePattern)];
    return all.length === 1 ? validationBody.match(pattern)?.[1] : undefined;
  };
  const peers = [...validationBody.matchAll(/unicast_peer\s*\{([^}]*)\}/gu)];
  const peerTokens = peers.length === 1 ? peers[0][1].trim().split(/\s+/u).filter(Boolean) : [];
  return {
    id: value(/virtual_router_id\s+(\d+)/u, /virtual_router_id\s+\S+/gu),
    state: value(/state\s+(MASTER|BACKUP)/u, /state\s+\S+/gu),
    priority: Number(value(/priority\s+(\d+)/u, /priority\s+\S+/gu)),
    source: value(/unicast_src_ip\s+(\S+)/u, /unicast_src_ip\s+\S+/gu),
    peer: peerTokens.length === 1 ? peerTokens[0] : undefined,
    body,
    validationBody,
  };
}
