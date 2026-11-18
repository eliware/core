import { expect, test } from "@jest/globals";
import createPairRepo from "../../test-fixtures/core-pair.mjs";
import validatePair from "../../src/pair/rules.mjs";

function maps() {
  return [
    new Map(Object.entries(createPairRepo("core1"))),
    new Map(Object.entries(createPairRepo("core2"))),
  ];
}

test("accepts reciprocal router, DHCP, Keepalived, and conntrack settings", () => {
  const [core1, core2] = maps();

  expect(validatePair("core1", "core2", core1, core2).errors).toEqual([]);
});

test("requires a Core1 and Core2 pair with FRR configuration", () => {
  const [core1, core2] = maps();
  expect(validatePair("core1", "other", core1, core2).errors[0]).toContain("requires one");
  core1.delete("etc/frr/frr.conf");
  expect(validatePair("core1", "core2", core1, core2).errors[0]).toContain("frr.conf");
});

test("reports broken FRR identities, peers, weights, and neighbor sets", () => {
  const [core1, core2] = maps();
  core1.set(
    "etc/frr/frr.conf",
    core1
      .get("etc/frr/frr.conf")
      .replace("hostname core1.purinton.us", "hostname wrong.purinton.us")
      .replace("neighbor 10.0.0.2 weight 250", "neighbor 10.0.0.2 weight 0")
      .replace("neighbor 10.0.0.20 remote-as 65200\n", ""),
  );
  core2.set(
    "etc/frr/frr.conf",
    core2
      .get("etc/frr/frr.conf")
      .replace("bgp router-id 10.0.0.2", "bgp router-id 10.0.0.1")
      .replace("neighbor 10.0.0.1 remote-as 65001", "neighbor 10.0.0.1 remote-as 65003"),
  );

  const errors = validatePair("core1", "core2", core1, core2).errors.join(" ");
  expect(errors).toContain("hostname must identify core1");
  expect(errors).toContain("weight outside the valid range");
  expect(errors).toContain("neighbor sets must match");
  expect(errors).toContain("peer addresses must point");
  expect(errors).toContain("peer AS numbers must point");
});

test("rejects unmatched weight maps and malformed Kea settings", () => {
  const [core1, core2] = maps();
  core2.set(
    "etc/frr/frr.conf",
    core2
      .get("etc/frr/frr.conf")
      .replace("neighbor 10.0.0.20 weight 200", "neighbor 10.0.0.21 weight 200")
      .replace("neighbor 10.0.0.20 remote-as 65200", "neighbor 10.0.0.21 remote-as 65200"),
  );
  core1.set("etc/kea/kea-dhcp4.conf", "not JSON");
  core2.set(
    "etc/kea/kea-dhcp4.conf",
    core2
      .get("etc/kea/kea-dhcp4.conf")
      .replace("core2.purinton.us", "wrong.purinton.us")
      .replace("10.0.0.2:8000", "10.0.0.1:8000"),
  );

  const errors = validatePair("core1", "core2", core1, core2).errors.join(" ");
  expect(errors).toContain("route preference weights must cover the same neighbors");
  expect(errors).toContain("Kea core1 DHCPv4 HA configuration is missing or invalid");
  expect(errors).toContain("Kea core2 must name itself");
  expect(errors).toContain("Kea core2 HA URL must use its FRR router ID");
});

test("rejects incorrect Keepalived, conntrackd, and connected prefix relationships", () => {
  const [core1, core2] = maps();
  core1.set(
    "etc/keepalived/keepalived.conf",
    core1
      .get("etc/keepalived/keepalived.conf")
      .replace("virtual_router_id 169", "virtual_router_id 170"),
  );
  core2.set(
    "etc/keepalived/keepalived.conf",
    core2
      .get("etc/keepalived/keepalived.conf")
      .replace("state BACKUP", "state UNKNOWN")
      .replace("unicast_src_ip 10.0.0.2", "unicast_src_ip 10.0.0.9"),
  );
  core1.set("etc/conntrackd/conntrackd.conf", "bad config\n");
  core2.set("scripts/frr-connected-prefix.sh", 'address="10.0.0.9/24"\n');

  const errors = validatePair("core1", "core2", core1, core2).errors.join(" ");
  expect(errors).toContain("matching VRIDs and virtual addresses");
  expect(errors).toContain("peer addresses must be reciprocal");
  expect(errors).toContain("one MASTER and one BACKUP");
  expect(errors).toContain("Conntrackd peer addresses");
  expect(errors).toContain("connected prefix on core2");
});

test("rejects missing VRRP instances and invalid priority pairs", () => {
  const [core1, core2] = maps();
  core1.set("etc/keepalived/keepalived.conf", "global_defs { router_id CORE1 }\n");
  core2.set(
    "etc/keepalived/keepalived.conf",
    core2.get("etc/keepalived/keepalived.conf").replace("priority 101", "priority 99"),
  );

  const errors = validatePair("core1", "core2", core1, core2).errors.join(" ");
  expect(errors).toContain("parsable Keepalived VRRP instances");
});
