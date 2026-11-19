import { expect, test } from "@jest/globals";
import validateAddressRecord from "../../../../../src/preflight/network/dns/records/address.mjs";

test.each([
  ["A", ["192.0.2.1"], null],
  ["AAAA", ["2001:db8::1"], null],
  ["A", ["2001:db8::1"], "A record has an invalid address"],
  ["AAAA", ["192.0.2.1"], "AAAA record has an invalid address"],
  ["A", [], "A record has an invalid address"],
  ["MX", ["10", "mail.test."], null],
])("validates %s record address fields", (type, fields, expected) => {
  expect(validateAddressRecord(type, fields)).toBe(expected);
});
