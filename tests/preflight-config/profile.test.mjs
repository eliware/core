import { expect, test } from "@jest/globals";
import validateProfile from "../../src/preflight-config/profile.mjs";

const files = [
  "etc/chrony.conf",
  "etc/named.conf",
  "etc/frr/daemons",
  "etc/frr/frr.conf",
  "etc/haproxy/haproxy.cfg",
  "etc/kea/kea-dhcp4.conf",
  "etc/kea/kea-dhcp6.conf",
  "etc/kea/kea-dhcp-ddns.conf",
  "etc/kea/kea-ctrl-agent.conf",
  "etc/keepalived/keepalived.conf",
  "etc/conntrackd/conntrackd.conf",
  "etc/sysconfig/iptables",
  "etc/sysconfig/ip6tables",
  "etc/wireguard/wg0.conf",
];

test("accepts a generic router profile with all required files", () => {
  expect(validateProfile(files, "@eliware/router-east")).toEqual([]);
});

test("reports missing required paths without checking deployment names", () => {
  expect(validateProfile([], "@eliware/other")).toEqual(
    expect.arrayContaining(["FAIL required router configuration is missing: etc/chrony.conf."]),
  );
});

test("skips profile requirements when no package identity is supplied", () => {
  expect(validateProfile([], undefined)).toEqual([]);
});
