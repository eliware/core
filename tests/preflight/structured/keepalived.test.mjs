import { expect, test } from "@jest/globals";
import validateKeepalived from "../../../src/preflight/structured/keepalived.mjs";

test("checks VRRP fields, priority, and notification script references", () => {
  const files = ["etc/keepalived/notify.sh"];
  const valid =
    "vrrp_instance VI { state MASTER\ninterface enX0\nvirtual_router_id 1\npriority 101\nunicast_src_ip 10.0.0.1\nunicast_peer { 10.0.0.2 }\nvirtual_ipaddress { 10.0.0.254/24 }\nnotify_master /etc/keepalived/notify.sh\n}";
  expect(validateKeepalived("etc/keepalived/keepalived.conf", valid, files)).toEqual([]);
  expect(
    validateKeepalived(
      "etc/keepalived/keepalived.conf",
      "vrrp_instance bad { priority 999 }",
      [],
    ).join(" "),
  ).toContain("has an invalid priority");
  expect(
    validateKeepalived("etc/keepalived/keepalived.conf", "vrrp_instance broken {", []).join(" "),
  ).toContain("no VRRP instances are defined");
  expect(
    validateKeepalived(
      "etc/keepalived/keepalived.conf",
      valid.replace("notify.sh", "missing.sh"),
      [],
    ).join(" "),
  ).toContain("referenced etc/keepalived/missing.sh script is missing");
  expect(
    validateKeepalived(
      "etc/keepalived/keepalived.conf",
      valid.replace("/etc/keepalived/notify.sh", "/usr/bin/true"),
      [],
    ),
  ).toEqual([]);
});
