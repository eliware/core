import { expect, test } from "@jest/globals";
import validateNamedReferences from "../../../src/preflight/structured/named-references.mjs";

test("resolves repository, zone, and relative include references", () => {
  const text = 'file "zones/example.zone"; include "named.local"; include "/etc/custom.conf";';
  const files = ["var/named/zones/example.zone", "etc/named.local", "etc/custom.conf"];
  expect(
    validateNamedReferences(
      "etc/named.conf",
      text,
      files,
      ".",
      () => "",
      (path) => path,
    ),
  ).toEqual([]);
});

test("reports missing and unreadable local references", () => {
  expect(
    validateNamedReferences(
      "etc/named.conf",
      'include "named.missing"; file "zones/missing.zone";',
      [],
      ".",
      () => "",
    ),
  ).toEqual([
    "FAIL etc/named.conf: referenced etc/named.missing file is missing.",
    "FAIL etc/named.conf: referenced var/named/zones/missing.zone file is missing.",
  ]);
  expect(
    validateNamedReferences(
      "etc/named.conf",
      'file "zones/example.zone";',
      ["var/named/zones/example.zone"],
      ".",
      () => {
        throw new Error("denied");
      },
    ),
  ).toEqual(["FAIL etc/named.conf: referenced var/named/zones/example.zone file cannot be read."]);
});

test("ignores system-managed includes and resolves managed absolute paths", () => {
  expect(
    validateNamedReferences(
      "etc/named.conf",
      'include "/etc/named.root.key"; file "/eliware/core/var/named/example.zone";',
      ["var/named/example.zone"],
      ".",
      () => "",
      (path) => path,
    ),
  ).toEqual([]);
});

test("ignores absolute file paths outside managed repository locations", () => {
  expect(
    validateNamedReferences("etc/named.conf", 'file "/opt/named.conf";', [], ".", () => ""),
  ).toEqual([]);
});
