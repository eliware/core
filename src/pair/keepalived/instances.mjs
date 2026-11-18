export default function parseInstances(text) {
  const instances = new Map();
  const headers = [...text.matchAll(/vrrp_instance\s+(\S+)\s*\{/gu)];
  for (const header of headers) {
    let depth = 1;
    let end = header.index + header[0].length;
    while (depth > 0 && end < text.length) {
      if (text[end] === "{") depth += 1;
      if (text[end] === "}") depth -= 1;
      end += 1;
    }
    if (depth !== 0) return null;
    const body = text.slice(header.index + header[0].length, end - 1);
    const value = (pattern) => body.match(pattern)?.[1];
    const vips = body
      .match(/virtual_ipaddress\s*\{([^}]*)\}/u)?.[1]
      ?.split(/\s+/u)
      .filter((item) => /^\d+\.\d+\.\d+\.\d+\//u.test(item))
      .sort();
    instances.set(header[1], {
      id: value(/virtual_router_id\s+(\d+)/u),
      state: value(/state\s+(MASTER|BACKUP)/u),
      priority: Number(value(/priority\s+(\d+)/u)),
      source: value(/unicast_src_ip\s+(\S+)/u),
      peer: body.match(/unicast_peer\s*\{\s*(\S+)/u)?.[1],
      vips: vips ?? [],
    });
  }
  return instances.size > 0 ? instances : null;
}
