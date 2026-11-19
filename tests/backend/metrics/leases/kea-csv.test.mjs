import { expect, test } from "@jest/globals";
import countKeaLeases from "../../../../src/backend/metrics/leases/kea-csv.mjs";

const now = Date.parse("2026-11-19T12:00:00Z");
const headers =
  "address,hwaddr,client_id,valid_lifetime,expire,subnet_id,fqdn_fwd,fqdn_rev,hostname,state,user_context,pool_id";

test("counts active, unexpired Kea CSV leases", () => {
  expect(
    countKeaLeases(`${headers}\n"10.0.0.2","aa",,3600,1795093200,1,0,0,"host",0,,1\n`, now),
  ).toBe(1);
});

test("ignores missing, expired, and inactive Kea leases", () => {
  const rows = [
    '"",aa,,3600,1795093200,1,0,0,host,0,,1',
    '"10.0.0.3",aa,,3600,1795093200,1,0,0,host,3,,1',
    '"10.0.0.4",aa,,3600,1000000000,1,0,0,host,0,,1',
  ].join("\n");
  expect(countKeaLeases(`${headers}\n${rows}`, now)).toBe(0);
  expect(countKeaLeases("", now)).toBe(0);
});
