import { expect, test } from "@jest/globals";
import summarizeLeases from "../../../src/backend/metrics/dhcp-leases.mjs";

test("counts active DHCP leases without retaining lease details", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  const isc =
    "lease 10.0.0.2 { ends 4 2026/11/19 13:00:00; binding state active; }\nlease 10.0.0.3 { ends 4 2026/11/19 11:00:00; binding state active; }\nlease 10.0.0.4 { binding state active; }\nlease 10.0.0.5 { ends 4 2026/11/19 13:00:00; binding state free; }";
  expect(summarizeLeases(isc, "isc", now)).toEqual({ totals: { activeLeases: 1 } });
  expect(summarizeLeases("1795093200 aa:bb:cc:dd:ee:ff 10.0.0.2 host *\n", "dnsmasq", now)).toEqual(
    { totals: { activeLeases: 1 } },
  );
  expect(summarizeLeases("bad line\n0 aa - host *\n", "dnsmasq", now)).toEqual({
    totals: { activeLeases: 0 },
  });
  expect(summarizeLeases("0 aa 10.0.0.3 host *\n1799999999 aa\n", "dnsmasq", now)).toEqual({
    totals: { activeLeases: 0 },
  });
  const kea =
    'address,hwaddr,client_id,valid_lifetime,expire,subnet_id,fqdn_fwd,fqdn_rev,hostname,state,user_context,pool_id\n"10.0.0.2","aa",,3600,1795093200,1,0,0,"host",0,,1\n';
  expect(summarizeLeases(kea, "kea-csv", now)).toEqual({ totals: { activeLeases: 1 } });
  expect(summarizeLeases("", "kea-csv", now)).toEqual({ totals: { activeLeases: 0 } });
  expect(summarizeLeases("", "isc")).toEqual({ totals: { activeLeases: 0 } });
  expect(
    summarizeLeases(kea.replace('"10.0.0.2"', '""').replace(",0,,1", ",3,,1"), "kea-csv", now),
  ).toEqual({ totals: { activeLeases: 0 } });
});
