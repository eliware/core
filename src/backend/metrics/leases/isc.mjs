export default function countIscLeases(source, now) {
  const latest = new Set();
  for (const [, address, body] of source.matchAll(/lease\s+(\S+)\s*\{([\s\S]*?)\}/gu)) {
    const ends = body.match(/ends\s+(?:\d+\s+)?([^;]+);/u)?.[1]?.trim();
    const binding = body.match(/binding state\s+(\w+)/u)?.[1];
    const expiry = ends ? Date.parse(`${ends.replaceAll("/", "-").replace(/\s+/u, "T")}Z`) : NaN;
    if (binding === "active" && Number.isFinite(expiry) && expiry > now) latest.add(address);
    else latest.delete(address);
  }
  return latest.size;
}
