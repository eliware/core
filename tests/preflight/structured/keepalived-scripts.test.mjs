import { expect, test } from "@jest/globals";
import validateKeepalivedScripts from "../../../src/preflight/structured/keepalived-scripts.mjs";

const file = "etc/keepalived/keepalived.conf";
const instance = `vrrp_instance VI { state MASTER
interface enX0
virtual_router_id 1
priority 101
unicast_src_ip 10.0.0.1
unicast_peer { 10.0.0.2 }
virtual_ipaddress { 10.0.0.254/24 }
track_script { check.dns }
}`;

test("accepts tracked local scripts declared in the configuration", () => {
  const declaration = 'vrrp_script check.dns { script "/eliware/router-config/scripts/check.sh" }';
  expect(
    validateKeepalivedScripts(file, `${instance}\n${declaration}`, ["scripts/check.sh"]),
  ).toEqual([]);
});

test("reports tracked scripts without declarations and missing files", () => {
  expect(validateKeepalivedScripts(file, instance, []).join(" ")).toContain(
    "tracked script check.dns is not defined",
  );
  const declaration = 'vrrp_script check.dns { script "/eliware/router-config/scripts/check.sh" }';
  expect(validateKeepalivedScripts(file, `${instance}\n${declaration}`, []).join(" ")).toContain(
    "referenced scripts/check.sh script is missing",
  );
});

test("checks notification and declared script references", () => {
  const notify = instance.replace(
    "track_script { check.dns }",
    "notify_master /etc/keepalived/missing.sh",
  );
  expect(validateKeepalivedScripts(file, notify, [])).toContain(
    "FAIL etc/keepalived/keepalived.conf: referenced etc/keepalived/missing.sh script is missing.",
  );
  expect(
    validateKeepalivedScripts(
      file,
      instance.replace("track_script { check.dns }", "notify_master /usr/bin/true"),
      [],
    ),
  ).toEqual([]);
  expect(
    validateKeepalivedScripts(
      file,
      'vrrp_script probe { script "/eliware/router-config/scripts/missing.sh" }',
      [],
    ),
  ).toContain(
    "FAIL etc/keepalived/keepalived.conf: referenced scripts/missing.sh script is missing.",
  );
});

test("ignores empty script declarations and files without instances", () => {
  expect(validateKeepalivedScripts(file, "vrrp_script empty { interval 1 }", [])).toEqual([]);
});
