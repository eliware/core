import { expect, test } from "@jest/globals";
import validateFrr from "../../../src/preflight/network/frr.mjs";

test("accepts a BGP router with an activated neighbor", () => {
  expect(
    validateFrr(
      "frr.conf",
      "router bgp 65001\n bgp router-id 10.0.0.1\n neighbor 10.0.0.2 remote-as 65002\n address-family ipv4 unicast\n neighbor 10.0.0.2 weight 100\n network 192.168.1.0/24\n exit-address-family\n",
    ),
  ).toEqual([]);
});

test("rejects malformed BGP statements and missing router settings", () => {
  const result = validateFrr(
    "frr.conf",
    "router bgp bad\n neighbor bad remote-as nope\n neighbor xyz\n neighbor 10.0.0.2 remote-as nope\n neighbor 10.0.0.4 remote-as 4294967296\n neighbor 10.0.0.7 remote-as\n bgp router-id bad\n address-family ipv4 unicast\n neighbor 10.0.0.3 weight 70000\n neighbor 10.0.0.6 weight nope\n neighbor 10.0.0.8 weight\n exit-address-family\n neighbor 10.0.0.5 weight 100\n network bad\n unknown statement\n",
  ).join(" ");
  expect(result).toContain("invalid neighbor statement");
  expect(result).toContain("remote-as must be a valid ASN");
  expect(result).toContain("router ID must be an IPv4 address");
  expect(result).toContain("weight must be within");
  expect(result).toContain("network must use IPv4 CIDR");
  expect(result).toContain("router bgp section is required");
});

test("rejects an IPv6 BGP router ID", () => {
  expect(
    validateFrr(
      "frr.conf",
      "router bgp 65001\n bgp router-id 2001:db8::1\n neighbor 10.0.0.2 remote-as 65002\n",
    ),
  ).toContain("FAIL frr.conf:2: router ID must be an IPv4 address.");
});

test("rejects repeated BGP router sections", () => {
  const text =
    "router bgp 65001\n bgp router-id 10.0.0.1\n neighbor 10.0.0.2 remote-as 65002\nrouter bgp 65001\n";
  expect(validateFrr("frr.conf", text)).toContain("FAIL frr.conf:4: duplicate BGP router section.");
});
