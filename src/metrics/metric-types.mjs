const routerMetricTypes = new Set(["interfaces", "routes", "arp", "frr", "vrrp"]);
const serviceMetricTypes = new Set(["haproxy", "dhcp-leases", "dns-cache", "ntp"]);

export default function classifyMetricType(type) {
  if (routerMetricTypes.has(type)) return "router";
  if (serviceMetricTypes.has(type)) return "service";
  return undefined;
}
