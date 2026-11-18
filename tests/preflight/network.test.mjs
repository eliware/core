import { expect, test } from "@jest/globals";
import validateNetwork from "../../src/preflight/network.mjs";

test("routes DNS, firewall, and FRR files to their validators", () => {
  expect(validateNetwork("var/named/zones/test.zone", "").join(" ")).toContain(
    "exactly one SOA record is required",
  );
  expect(validateNetwork("etc/sysconfig/iptables", "").join(" ")).toContain(
    "filter table is required",
  );
  expect(validateNetwork("etc/frr/frr.conf", "").join(" ")).toContain(
    "router bgp section is required",
  );
  expect(validateNetwork("etc/chrony.conf", "")).toEqual([]);
});
