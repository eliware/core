export default function tokenizeDnsRecord(line) {
  return line.replace(/[()]/gu, " ").match(/"(?:[^"\\]|\\.)*"|\S+/gu) ?? [];
}
