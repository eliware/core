import parseVirtualAddresses from "./virtual-addresses.mjs";

export default function parseInstances(text) {
  const source = maskCommentsAndStrings(text);
  const instances = new Map();
  const headers = [...source.matchAll(/vrrp_instance\s+(\S+)\s*\{/gu)];
  for (const header of headers) {
    if (instances.has(header[1])) return null;
    let depth = 1;
    let end = header.index + header[0].length;
    while (depth > 0 && end < source.length) {
      if (source[end] === "{") depth += 1;
      if (source[end] === "}") depth -= 1;
      end += 1;
    }
    if (depth !== 0) return null;
    const start = header.index + header[0].length;
    const body = text.slice(start, end - 1);
    const validationBody = source.slice(start, end - 1);
    const value = (pattern, uniquePattern) => {
      const all = [...validationBody.matchAll(uniquePattern)];
      return all.length === 1 ? validationBody.match(pattern)?.[1] : undefined;
    };
    const peers = [...validationBody.matchAll(/unicast_peer\s*\{([^}]*)\}/gu)];
    const peerTokens = peers.length === 1 ? peers[0][1].trim().split(/\s+/u).filter(Boolean) : [];
    const virtualIps = parseVirtualAddresses(body);
    instances.set(header[1], {
      id: value(/virtual_router_id\s+(\d+)/u, /virtual_router_id\s+\S+/gu),
      state: value(/state\s+(MASTER|BACKUP)/u, /state\s+\S+/gu),
      priority: Number(value(/priority\s+(\d+)/u, /priority\s+\S+/gu)),
      source: value(/unicast_src_ip\s+(\S+)/u, /unicast_src_ip\s+\S+/gu),
      peer: peerTokens.length === 1 ? peerTokens[0] : undefined,
      vips: virtualIps.valid,
      invalidVips: virtualIps.invalid,
      body,
      validationBody,
    });
  }
  return instances.size > 0 ? instances : null;
}

function maskCommentsAndStrings(text) {
  const chars = [...text];
  let quote;
  let comment = false;
  let escaped = false;
  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    if (comment) {
      if (char === "\n") comment = false;
      else chars[index] = " ";
    } else if (quote) {
      chars[index] = char === "\n" ? "\n" : " ";
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = undefined;
    } else if (char === "#") {
      chars[index] = " ";
      comment = true;
    } else if (char === '"' || char === "'") {
      chars[index] = " ";
      quote = char;
    }
  }
  return chars.join("");
}
