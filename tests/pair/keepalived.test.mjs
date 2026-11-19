import { expect, test } from "@jest/globals";
import createPairRepo from "../../test-fixtures/core-pair.mjs";
import validateKeepalived from "../../src/pair/keepalived.mjs";

const first = createPairRepo("core1");
const second = createPairRepo("core2");
const node1 = { routerId: "10.0.0.1" };
const node2 = { routerId: "10.0.0.2" };

test("checks matching VRIDs, virtual addresses, peer addresses, and roles", () => {
  expect(
    validateKeepalived(
      node1,
      node2,
      first["etc/keepalived/keepalived.conf"],
      second["etc/keepalived/keepalived.conf"],
    ),
  ).toEqual([]);
});

test("ignores braces in comments and quoted instance values", () => {
  const left = `# } vrrp_instance ignored {\n${first["etc/keepalived/keepalived.conf"].replace(
    "state MASTER",
    'state MASTER\n  notify_master "/usr/bin/echo { ignored }" # }',
  )}`;

  expect(validateKeepalived(node1, node2, left, second["etc/keepalived/keepalived.conf"])).toEqual(
    [],
  );
});

test("reports unparseable, missing, mismatched, and nonreciprocal instances", () => {
  const invalidFirst = "vrrp_instance BROKEN {";
  const missing = "vrrp_instance OTHER { state MASTER }";
  const wrongSecond = second["etc/keepalived/keepalived.conf"].replace(
    "unicast_src_ip 10.0.0.2",
    "unicast_src_ip 10.0.0.9",
  );

  expect(validateKeepalived(node1, node2, invalidFirst, wrongSecond)[0]).toContain("parsable");
  const errors = validateKeepalived(
    node1,
    node2,
    first["etc/keepalived/keepalived.conf"],
    missing,
  ).join(" ");
  expect(errors).toContain("instance sets must match");
  expect(errors).toContain("partner is missing");
  const mismatch = first["etc/keepalived/keepalived.conf"].replace(
    "virtual_router_id 169",
    "virtual_router_id 170",
  );
  expect(
    validateKeepalived(node1, node2, mismatch, second["etc/keepalived/keepalived.conf"]).join(" "),
  ).toContain("virtual addresses");
});

test("rejects a duplicate master role, wrong peer address, and duplicate router ID", () => {
  const altered = second["etc/keepalived/keepalived.conf"]
    .replace("state BACKUP", "state MASTER")
    .replace("unicast_peer { 10.0.0.1 }", "unicast_peer { 10.0.0.9 }");
  const errors = validateKeepalived(
    node1,
    node2,
    first["etc/keepalived/keepalived.conf"],
    altered,
  ).join(" ");
  expect(errors).toContain("one MASTER and one BACKUP");
  expect(errors).toContain("peer addresses must be reciprocal");
  expect(
    validateKeepalived(
      node1,
      node1,
      first["etc/keepalived/keepalived.conf"],
      second["etc/keepalived/keepalived.conf"],
    ),
  ).toContain("Keepalived router IDs must differ.");
});
test("rejects a malformed VRRP block", () => {
  const broken = first["etc/keepalived/keepalived.conf"].replace(
    "virtual_router_id 169",
    "virtual_router_id x",
  );
  expect(
    validateKeepalived(node1, node2, broken, second["etc/keepalived/keepalived.conf"]).join(" "),
  ).toContain("matching VRIDs");
});

test("requires a higher priority on the master", () => {
  const lower = first["etc/keepalived/keepalived.conf"].replace("priority 101", "priority 99");
  expect(
    validateKeepalived(node1, node2, lower, second["etc/keepalived/keepalived.conf"]).join(" "),
  ).toContain("MASTER priority must be higher");
});

test("rejects an invalid virtual address", () => {
  const invalidFirst = first["etc/keepalived/keepalived.conf"].replace(
    "192.0.2.169/24",
    "invalid-address",
  );
  const invalid = second["etc/keepalived/keepalived.conf"].replace(
    "192.0.2.169/24",
    "invalid-address",
  );

  expect(
    validateKeepalived(node1, node2, invalidFirst, second["etc/keepalived/keepalived.conf"]),
  ).toContain("Keepalived VI_169 has an invalid virtual address.");
  expect(
    validateKeepalived(node1, node2, first["etc/keepalived/keepalived.conf"], invalid),
  ).toContain("Keepalived VI_169 has an invalid virtual address.");
});

test("uses empty default Keepalived text when configs are omitted", () => {
  expect(validateKeepalived(node1, node2)).toEqual([
    "Both repos need parsable Keepalived VRRP instances.",
  ]);
});
