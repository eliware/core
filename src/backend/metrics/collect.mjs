import collectRouterMetric from "./collect/router.mjs";
import collectServiceMetric from "./collect/services.mjs";

const serviceMetricTypes = new Set(["haproxy", "dhcp-leases", "dns-cache", "ntp"]);

export default function collectMetric(metric, options = {}) {
  return serviceMetricTypes.has(metric.type)
    ? collectServiceMetric(metric, options)
    : collectRouterMetric(metric, options);
}
