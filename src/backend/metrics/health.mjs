export default function metricIsUnhealthy(type, values) {
  return (
    (type === "ntp" && values.synchronized === false) ||
    (type === "haproxy" &&
      (values.totals.down > 0 ||
        values.backends.some(({ state }) => !/^UP\b/u.test(state ?? "")))) ||
    (type === "frr" && values.totals.down > 0) ||
    (type === "arp" && values.totals.failed > 0) ||
    (type === "vrrp" && values.totals.fault > 0)
  );
}
