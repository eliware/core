import { expect, test } from "@jest/globals";
import countDnsmasqLeases from "../../../../src/backend/metrics/leases/dnsmasq.mjs";

test("counts valid future dnsmasq leases", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  expect(countDnsmasqLeases("1795093200 aa:bb:cc:dd:ee:ff 10.0.0.2 host *\n", now)).toBe(1);
});

test("ignores invalid, expired, and incomplete dnsmasq lease lines", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  const source = "bad line\n0 aa - host *\n1799999999 aa\n";
  expect(countDnsmasqLeases(source, now)).toBe(0);
});
