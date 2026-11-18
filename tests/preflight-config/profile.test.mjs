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

test("accepts either router profile with all required files", () => {
  expect(validateProfile(files, "@eliware/core1")).toEqual([]);
  expect(validateProfile(files, "@eliware/core2")).toEqual([]);
});

test("reports an unsupported profile and missing required paths", () => {
  expect(validateProfile([], "@eliware/other")).toEqual(
    expect.arrayContaining([
      "FAIL package.json name must be @eliware/core1 or @eliware/core2.",
      "FAIL required router configuration is missing: etc/chrony.conf.",
    ]),
  );
});

test("skips profile requirements when no package identity is supplied", () => {
  expect(validateProfile([], undefined)).toEqual([]);
});
