import { expect, test } from "@jest/globals";
import parseVirtualAddresses from "../../../src/pair/keepalived/virtual-addresses.mjs";

test("parses and sorts virtual IPv4 addresses", () => {
  expect(parseVirtualAddresses("virtual_ipaddress {\n 192.0.2.2/24\n 192.0.2.1/24\n}")).toEqual({
    valid: ["192.0.2.1/24", "192.0.2.2/24"],
    invalid: [],
  });
});

test("reports missing blocks and invalid addresses", () => {
  expect(parseVirtualAddresses("state MASTER")).toEqual({ valid: [], invalid: ["missing"] });
  expect(parseVirtualAddresses("virtual_ipaddress {\n invalid-address\n}")).toEqual({
    valid: [],
    invalid: ["invalid-address", "missing"],
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
