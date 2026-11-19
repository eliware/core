import countIscLeases from "./leases/isc.mjs";
import countDnsmasqLeases from "./leases/dnsmasq.mjs";
import countKeaLeases from "./leases/kea-csv.mjs";

export default function summarizeLeases(source, format, now = Date.now()) {
  const activeLeases =
    format === "isc"
      ? countIscLeases(source, now)
      : format === "dnsmasq"
        ? countDnsmasqLeases(source, now)
        : countKeaLeases(source, now);
  return { totals: { activeLeases } };
}
