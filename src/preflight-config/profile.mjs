const requiredFiles = [
  "etc/chrony.conf",
  "etc/named.conf",
  "etc/frr/daemons",
  "etc/frr/frr.conf",
  "etc/haproxy/haproxy.cfg",
  "etc/kea/kea-dhcp4.conf",
  "etc/kea/kea-dhcp6.conf",
  "etc/kea/kea-dhcp-ddns.conf",
  "etc/kea/kea-ctrl-agent.conf",
  "etc/keepalived/keepalived.conf",
  "etc/conntrackd/conntrackd.conf",
  "etc/sysconfig/iptables",
  "etc/sysconfig/ip6tables",
  "etc/wireguard/wg0.conf",
];

export default function validateProfile(files, repositoryName) {
  if (repositoryName === undefined) return [];
  const errors = [];
  if (!["@eliware/core1", "@eliware/core2"].includes(repositoryName))
    errors.push("FAIL package.json name must be @eliware/core1 or @eliware/core2.");
  for (const file of requiredFiles) {
    if (!files.includes(file))
      errors.push(`FAIL required router configuration is missing: ${file}.`);
  }
  return errors;
}
