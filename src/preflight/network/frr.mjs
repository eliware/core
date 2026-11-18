import { isIP } from "node:net";

export default function validateFrr(file, text) {
  const errors = [];
  let bgp = false;
  let addressFamily = false;
  const neighbors = new Set();
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    const value = line.trim();
    if (!value || value === "!") continue;
    if (/^router bgp\s+\d+$/u.test(value)) bgp = true;
    else if (value === "address-family ipv4 unicast") addressFamily = true;
    else if (value === "exit-address-family") addressFamily = false;
    else if (/^bgp router-id\s+/u.test(value)) {
      if (!isIP(value.split(/\s+/u).at(-1)))
        errors.push(`FAIL ${file}:${index + 1}: router ID must be an IP address.`);
    } else if (value.startsWith("neighbor ")) {
      const peer = value.match(
        /^neighbor\s+(\S+)\s+(remote-as|description|bfd|activate|weight)\b(?:\s+(\S+))?/u,
      );
      if (!peer || !isIP(peer[1]))
        errors.push(`FAIL ${file}:${index + 1}: invalid neighbor statement.`);
      else if (
        peer[2] === "remote-as" &&
        (!/^\d+$/u.test(peer[3] ?? "") || Number(peer[3]) > 4294967295)
      )
        errors.push(`FAIL ${file}:${index + 1}: remote-as must be a valid ASN.`);
      else if (
        peer[2] === "weight" &&
        (!addressFamily || !/^\d+$/u.test(peer[3] ?? "") || Number(peer[3]) > 65535)
      )
        errors.push(
          `FAIL ${file}:${index + 1}: weight must be within an IPv4 address family and between 0 and 65535.`,
        );
      if (peer) neighbors.add(peer[1]);
    } else if (/^network\s+/u.test(value)) {
      if (!/^network\s+\d+(?:\.\d+){3}\/\d+$/u.test(value))
        errors.push(`FAIL ${file}:${index + 1}: network must use IPv4 CIDR notation.`);
    } else if (
      !/^(?:frr defaults \S+|hostname \S+|service integrated-vtysh-config|bfd|peer \S+|no shutdown|no bgp ebgp-requires-policy|router bgp \d+)$/u.test(
        value,
      )
    )
      errors.push(`FAIL ${file}:${index + 1}: unknown FRR statement.`);
  }
  if (!bgp) errors.push(`FAIL ${file}: router bgp section is required.`);
  if (!/\bbgp router-id\s+\S+/u.test(text)) errors.push(`FAIL ${file}: BGP router ID is required.`);
  if (neighbors.size === 0) errors.push(`FAIL ${file}: at least one BGP neighbor is required.`);
  return errors;
}
