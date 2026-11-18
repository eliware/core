function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export default function parseFrr(text = "") {
  const hostname = uniqueValue(text, /^hostname\s+(\S+)\s*$/gmu);
  const asn = Number(uniqueValue(text, /^router bgp\s+(\d+)\s*$/gmu));
  const routerId = uniqueValue(text, /^\s+bgp router-id\s+(\S+)\s*$/gmu);
  const peerIp = uniqueValue(text, /^\s*neighbor\s+(\S+)\s+description core peer\s*$/gmu);
  const peerAsn = peerIp
    ? uniqueValue(
        text,
        new RegExp(`^\\s*neighbor\\s+${escapeRegex(peerIp)}\\s+remote-as\\s+(\\d+)\\s*$`, "gmu"),
      )
    : undefined;
  if (!hostname || !Number.isInteger(asn) || !routerId || !peerIp || !peerAsn) return null;
  const weights = new Map(
    [...text.matchAll(/^\s*neighbor\s+(\S+)\s+weight\s+(\d+)\s*$/gmu)].map((item) => [
      item[1],
      Number(item[2]),
    ]),
  );
  const neighbors = new Set(
    [...text.matchAll(/^\s*neighbor\s+(\S+)\s+remote-as\s+\d+\s*$/gmu)].map((item) => item[1]),
  );
  return {
    hostname,
    asn,
    routerId,
    peer: { ip: peerIp, asn: Number(peerAsn) },
    weights,
    neighbors,
  };
}

function uniqueValue(text, pattern) {
  const matches = [...text.matchAll(pattern)];
  return matches.length === 1 ? matches[0][1] : undefined;
}
