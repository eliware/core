import { expect, test } from "@jest/globals";
import parseVirtualAddresses from "../../../src/pair/keepalived/virtual-addresses.mjs";

test("parses and sorts virtual IPv4 addresses", () => {
  expect(parseVirtualAddresses("virtual_ipaddress {\n 192.0.2.2/24\n 192.0.2.1/24\n}")).toEqual({
    valid: ["192.0.2.1/24", "192.0.2.2/24"],
    invalid: [],
  });
});

test("extracts virtual addresses from an instance body with other settings", () => {
  expect(
    parseVirtualAddresses(
      "state MASTER\nvirtual_router_id 1\nvirtual_ipaddress {\n 192.0.2.9/24\n}\npriority 101",
    ),
  ).toEqual({ valid: ["192.0.2.9/24"], invalid: [] });
});

test("reports missing blocks and invalid addresses", () => {
  expect(parseVirtualAddresses("state MASTER")).toEqual({ valid: [], invalid: ["missing"] });
  expect(parseVirtualAddresses("virtual_ipaddress {\n invalid-address\n}")).toEqual({
    valid: [],
    invalid: ["invalid-address", "missing"],
  });
});

test.each(["192.0.2.0/24", "192.0.2.255/24", "0.0.0.0/0", "255.255.255.255/0"])(
  "rejects IPv4 network or broadcast address %s",
  (address) => {
    expect(parseVirtualAddresses(`virtual_ipaddress {\n ${address}\n}`).invalid).toEqual([
      address,
      "missing",
    ]);
  },
);

test("accepts all addresses in point-to-point prefixes", () => {
  expect(parseVirtualAddresses("virtual_ipaddress {\n 192.0.2.0/31\n 192.0.2.1/32\n}")).toEqual({
    valid: ["192.0.2.0/31", "192.0.2.1/32"],
    invalid: [],
  });
});

test("accepts supported address options and rejects unknown or incomplete options", () => {
  expect(
    parseVirtualAddresses("virtual_ipaddress {\n 192.0.2.1/24 dev enX0 label vip0 notrack\n}")
      .invalid,
  ).toEqual([]);
  expect(parseVirtualAddresses("virtual_ipaddress {\n 192.0.2.1/24 unknown\n}").invalid).toEqual([
    "192.0.2.1/24",
  ]);
  expect(parseVirtualAddresses("virtual_ipaddress {\n 192.0.2.1/24 dev\n}").invalid).toEqual([
    "192.0.2.1/24",
  ]);
  expect(parseVirtualAddresses("virtual_ipaddress {\n # no address\n}").invalid).toEqual([
    "missing",
  ]);
});

test("preserves a hash inside a quoted address option", () => {
  const text = `virtual_ipaddress {\n 192.0.2.1/24 label "vip#0"\n}`;
  expect(parseVirtualAddresses(text).invalid).toEqual([]);
});

test("preserves an escaped hash inside a quoted address option", () => {
  const text = `virtual_ipaddress {\n 192.0.2.1/24 label "vip\\#0"\n}`;
  expect(parseVirtualAddresses(text).invalid).toEqual([]);
});

test("parses quoted address options with CRLF line endings", () => {
  const text = 'virtual_ipaddress {\r\n 192.0.2.1/24 label "vip#0"\r\n}\r\n';
  expect(parseVirtualAddresses(text)).toEqual({ valid: ["192.0.2.1/24"], invalid: [] });
});
