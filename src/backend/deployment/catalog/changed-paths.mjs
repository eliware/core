export default function parseChangedPaths(output) {
  const entries = String(output ?? "").split("\0");
  const files = [];
  for (let index = 0; index < entries.length - 1;) {
    const status = entries[index++];
    if (!/^[ACDMRTUXB](?:\d{1,3})?$/u.test(status)) {
      files.push(status);
      continue;
    }
    if (status.startsWith("R") || status.startsWith("C")) {
      files.push(entries[index++], entries[index++]);
    } else {
      files.push(entries[index++]);
    }
  }
  return files.filter(Boolean);
}
