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
  for (const file of requiredFiles) {
    if (!files.includes(file))
      errors.push(`FAIL required router configuration is missing: ${file}.`);
  }
  return errors;
}
