import maskCommentsAndStrings from "./mask.mjs";
import extractInstanceFields from "./instance-fields.mjs";

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
    instances.set(header[1], extractInstanceFields(body, validationBody));
  }
  return instances.size > 0 ? instances : null;
}
