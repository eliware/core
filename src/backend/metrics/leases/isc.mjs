export default function countIscLeases(source, now) {
  const latest = new Map();
  for (const [, address, body] of source.matchAll(/lease\s+(\S+)\s*\{([\s\S]*?)\}/gu)) {
    const ends = body.match(/ends\s+(?:\d+\s+)?([^;]+);/u)?.[1]?.trim();
    const starts = body.match(/starts\s+(?:\d+\s+)?([^;]+);/u)?.[1]?.trim();
    const binding = body.match(/binding state\s+(\w+)/u)?.[1];
    const expiry = parseIscTime(ends);
    const startedAt = parseIscTime(starts);
    const previous = latest.get(address);
    if (
      !previous ||
      (startedAt === undefined && previous.startedAt === undefined) ||
      (startedAt !== undefined &&
        (previous.startedAt === undefined || startedAt >= previous.startedAt))
    ) {
      latest.set(address, {
        startedAt,
        active: binding === "active" && expiry !== undefined && expiry > now,
      });
    }
  }
  return [...latest.values()].filter(({ active }) => active).length;
}

function parseIscTime(value) {
  if (!value) return undefined;
  const timestamp = Date.parse(`${value.replaceAll("/", "-").replace(/\s+/u, "T")}Z`);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}
