import { expect, test } from "@jest/globals";
import validateStructured from "../../src/preflight/structured.mjs";

test("validates systemd units and router script references", () => {
  const files = ["scripts/start.sh"];
  const valid =
    "[Unit]\nDescription=Start app\n[Service]\nType=oneshot\nExecStart=/eliware/core1/scripts/start.sh\n";
  expect(
    validateStructured("etc/systemd/system/app.service", valid, files, "root", () => ""),
  ).toEqual([]);
  expect(
    validateStructured(
      "etc/systemd/system/app.service",
      "[Unit]\n[Service]\nExecStartPre=/bin/a\nExecStartPre=/bin/b\n",
      files,
      "root",
      () => "",
    ),
  ).toEqual([]);
  expect(
    validateStructured(
      "etc/systemd/system/app.service",
      "[Unit]\n[Service]\nExecStart=/eliware/core1/scripts/missing.sh\n",
      files,
      "root",
      () => "",
    ).join(" "),
  ).toContain("referenced scripts/missing.sh file is missing");
  expect(
    validateStructured(
      "etc/systemd/system/app.service",
      "key without equals\n",
      files,
      "root",
      () => "",
    ).join(" "),
  ).toContain("expected a section or key-value setting");
  expect(
    validateStructured(
      "etc/systemd/system/app.service",
      "[Unit]\nFoo=1\nFoo=2\n",
      files,
      "root",
      () => "",
    ).join(" "),
  ).toContain("duplicate Foo setting");
  expect(
    validateStructured(
      "etc/systemd/system/app.service.d/extra.conf",
      "[Service]\nExecStart=/eliware/core1/scripts/start.sh\n",
      files,
      "root",
      () => "",
    ),
  ).toEqual([]);
  expect(
    validateStructured(
      "etc/systemd/system/app.service.d/empty.conf",
      "",
      files,
      "root",
      () => "",
    ).join(" "),
  ).toContain("drop-in needs a unit section");
});

test("checks named configuration references and router blocks", () => {
  const files = ["var/named/zones/example.zone", "etc/keepalived/notify.sh"];
  const named =
    'options { directory "/var/named"; };\nzone "example.test" { file "zones/example.zone"; };\n';
  expect(validateStructured("etc/named.conf", named, files, "root", () => "")).toEqual([]);
  expect(
    validateStructured(
      "etc/named.conf",
      'zone "broken" { file "zones/missing.zone";\n',
      files,
      "root",
      () => "",
    ).join(" "),
  ).toContain("referenced var/named/zones/missing.zone file is missing");
  expect(
    validateStructured(
      "etc/named.conf",
      'options { file "/eliware/core1/var/named/zones/example.zone"; };',
      files,
      "root",
      () => "",
    ),
  ).toEqual([]);
  expect(
    validateStructured(
      "etc/named.rfc1912.zones",
      'zone x { file "/etc/named.ca"; };',
      files,
      "root",
      () => "",
    ),
  ).toEqual([]);
  expect(
    validateStructured(
      "etc/named.conf",
      'options { directory "/var/named"; }; zone x { file "zones/example.zone"; };',
      files,
      "root",
      () => {
        throw new Error("denied");
      },
    ).join(" "),
  ).toContain("file cannot be read");
  expect(
    validateStructured("etc/named.conf", "zone x {};", [], "root", () => "").join(" "),
  ).toContain("options block is missing");
  const keepalived =
    "vrrp_instance VI { state MASTER\ninterface enX0\nvirtual_router_id 1\npriority 101\nunicast_src_ip 10.0.0.1\nunicast_peer { 10.0.0.2 }\nvirtual_ipaddress { 10.0.0.254/24 }\nnotify_master /etc/keepalived/notify.sh\n}";
  expect(
    validateStructured("etc/keepalived/keepalived.conf", keepalived, files, "root", () => ""),
  ).toEqual([]);
  expect(
    validateStructured(
      "etc/keepalived/keepalived.conf",
      "vrrp_instance bad { priority 999 }",
      [],
      "root",
      () => "",
    ).join(" "),
  ).toContain("has an invalid priority");
  expect(
    validateStructured(
      "etc/keepalived/keepalived.conf",
      "vrrp_instance broken {",
      [],
      "root",
      () => "",
    ).join(" "),
  ).toContain("no VRRP instances are defined");
  expect(
    validateStructured(
      "etc/keepalived/keepalived.conf",
      "vrrp_instance bad { state MASTER interface enX0 virtual_router_id 1 priority 100 unicast_src_ip 10.0.0.1 unicast_peer { 10.0.0.2 } virtual_ipaddress { 10.0.0.254 } notify_master /etc/keepalived/missing.sh }",
      [],
      "root",
      () => "",
    ).join(" "),
  ).toContain("referenced etc/keepalived/missing.sh script is missing");
  expect(
    validateStructured(
      "etc/keepalived/keepalived.conf",
      "vrrp_instance bad { state MASTER interface enX0 virtual_router_id 1 priority 100 unicast_src_ip 10.0.0.1 unicast_peer { 10.0.0.2 } virtual_ipaddress { 10.0.0.254 } notify_master /usr/bin/true }",
      [],
      "root",
      () => "",
    ).join(" "),
  ).not.toContain("script is missing");
  expect(
    validateStructured(
      "etc/conntrackd/conntrackd.conf",
      "Sync { }\nGeneral { }",
      files,
      "root",
      () => "",
    ),
  ).toEqual([]);
  expect(
    validateStructured("etc/conntrackd/conntrackd.conf", "broken", files, "root", () => "").join(
      " ",
    ),
  ).toContain("Sync and General blocks");
  expect(
    validateStructured("etc/conntrackd/conntrackd.conf", "}", files, "root", () => "").join(" "),
  ).toContain("Sync and General blocks");
  expect(
    validateStructured(
      "etc/conntrackd/conntrackd.conf",
      'Sync { Note "escaped \\\" brace }"; } General { }',
      files,
      "root",
      () => "",
    ),
  ).toEqual([]);
  expect(validateStructured("etc/chrony.conf", "", files, "root", () => "")).toEqual([]);
});
