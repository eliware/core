import { expect, test } from "@jest/globals";
import validateNamed from "../../../src/preflight/structured/named.mjs";

test("checks named blocks and local zone file references", () => {
  const files = ["var/named/zones/example.zone"];
  const named =
    'options { directory "/var/named"; };\ninclude "named.rfc1912.zones";\nzone "example.test" { file "zones/example.zone"; };';
  const existingFiles = [...files, "etc/named.rfc1912.zones"];
  expect(validateNamed("etc/named.conf", named, existingFiles, ".", () => "")).toEqual([]);
  expect(
    validateNamed(
      "etc/named.conf",
      'options { }; include "zones/example.zone"; include "/etc/named.rfc1912.zones";',
      [...files, "etc/zones/example.zone", "etc/named.rfc1912.zones"],
      ".",
      () => "",
    ),
  ).toEqual([]);
  expect(
    validateNamed(
      "etc/named.conf",
      'options { }\ninclude "named.missing.zones";',
      files,
      ".",
      () => "",
    ).join(" "),
  ).toContain("referenced etc/named.missing.zones file is missing");
  expect(
    validateNamed(
      "etc/named.conf",
      'zone "broken" { file "zones/missing.zone";\n',
      files,
      ".",
      () => "",
    ).join(" "),
  ).toContain("referenced var/named/zones/missing.zone file is missing");
  expect(
    validateNamed(
      "etc/named.conf",
      'options { file "/eliware/router-config/var/named/zones/example.zone"; };',
      files,
      ".",
      () => "",
    ),
  ).toEqual([]);
  expect(
    validateNamed("etc/named.conf", 'options { file "zones/example.zone"; };', files, ".", () => {
      throw new Error("denied");
    }).join(" "),
  ).toContain("file cannot be read");
  expect(validateNamed("etc/named.conf", "zone x {};", [], ".", () => "").join(" ")).toContain(
    "options block is missing",
  );
  expect(
    validateNamed(
      "etc/named.rfc1912.zones",
      'zone x { file "/etc/named.ca"; };',
      files,
      ".",
      () => "",
    ),
  ).toEqual([]);
});

test("allows the system-managed BIND policy and root trust anchor includes", () => {
  const text =
    'options { directory "/var/named"; };\ninclude "/etc/crypto-policies/back-ends/bind.config";\ninclude "/etc/named.root.key";';
  expect(validateNamed("etc/named.conf", text, [], ".", () => "")).toEqual([]);
});

test("continues to require other repository-managed absolute includes", () => {
  const text = 'options { }; include "/etc/custom-named.conf";';
  expect(validateNamed("etc/named.conf", text, [], ".", () => "")).toContain(
    "FAIL etc/named.conf: referenced etc/custom-named.conf file is missing.",
  );
});
