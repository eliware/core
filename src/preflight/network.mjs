import validateDns from "./network/dns.mjs";
import validateFirewall from "./network/firewall.mjs";
import validateFrr from "./network/frr.mjs";

export default function validateNetwork(file, text) {
  if (file.startsWith("var/named/zones/")) return validateDns(file, text);
  if (file === "etc/sysconfig/iptables" || file === "etc/sysconfig/ip6tables")
    return validateFirewall(file, text);
  if (file === "etc/frr/frr.conf") return validateFrr(file, text);
  return [];
}
