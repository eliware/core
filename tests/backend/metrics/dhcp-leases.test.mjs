import { expect, test } from "@jest/globals";
import summarizeLeases from "../../../src/backend/metrics/dhcp-leases.mjs";

test("dispatches lease formats and returns only the aggregate", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  const isc = "lease 10.0.0.2 { ends 4 2026/11/19 13:00:00; binding state active; }";
  const dnsmasq = "1795093200 aa:bb:cc:dd:ee:ff 10.0.0.2 host *\n";
  const kea = 'address,expire,state\n"10.0.0.2",1795093200,0\n';
  expect(summarizeLeases(isc, "isc", now)).toEqual({ totals: { activeLeases: 1 } });
  expect(summarizeLeases(dnsmasq, "dnsmasq", now)).toEqual({ totals: { activeLeases: 1 } });
  expect(summarizeLeases(kea, "kea-csv", now)).toEqual({ totals: { activeLeases: 1 } });
  expect(summarizeLeases("", "unknown", now)).toEqual({ totals: { activeLeases: 0 } });
  expect(summarizeLeases("", "kea-csv")).toEqual({ totals: { activeLeases: 0 } });
});
