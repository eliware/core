import { expect, test } from "@jest/globals";
import validateNamed from "../../../src/preflight/structured/named.mjs";

test("checks named blocks and local zone file references", () => {
  const files = ["var/named/zones/example.zone"];
  const named =
    'options { directory "/var/named"; };\nzone "example.test" { file "zones/example.zone"; };';
  expect(validateNamed("etc/named.conf", named, files, ".", () => "")).toEqual([]);
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
      'options { file "/eliware/core1/var/named/zones/example.zone"; };',
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
