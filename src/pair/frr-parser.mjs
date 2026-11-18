function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export default function parseFrr(text = "") {
  const hostname = text.match(/^hostname\s+(\S+)/mu)?.[1];
  const asn = Number(text.match(/^router bgp\s+(\d+)/mu)?.[1]);
  const routerId = text.match(/^\s+bgp router-id\s+(\S+)/mu)?.[1];
  const peerIp = text.match(/^\s*neighbor\s+(\S+)\s+description core peer\s*$/mu)?.[1];
  const peerAsn = text.match(
    new RegExp(`^\\s*neighbor\\s+${escapeRegex(peerIp)}\\s+remote-as\\s+(\\d+)`, "mu"),
  )?.[1];
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
