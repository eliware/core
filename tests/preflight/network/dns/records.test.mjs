import { expect, test } from "@jest/globals";
import validateDnsRecord from "../../../../src/preflight/network/dns/records.mjs";

test.each([
  [["@", "IN", "SOA", "ns.test.", "host.test.", "1", "3600", "600", "86400", "300"], "SOA"],
  [["@", "IN", "NS", "ns.test."], "NS"],
  [["@", "IN", "A", "192.0.2.1"], "A"],
  [["@", "IN", "AAAA", "2001:db8::1"], "AAAA"],
  [["www", "IN", "CNAME", "@"], "CNAME"],
  [["1", "IN", "PTR", "ns.test."], "PTR"],
  [["@", "IN", "MX", "10", "mail.test."], "MX"],
])("validates DNS record tokens for %s", (tokens, type) => {
  expect(validateDnsRecord("test.zone", tokens, 1)).toMatchObject({ errors: [], type });
});

test.each([
  [["@", "IN", "SOA", "ns.test.", "host.test.", "1"], "SOA record needs five numeric timers"],
  [
    ["@", "IN", "SOA", "ns.test.", "host.test.", "1", "not-a-time", "600", "86400", "300"],
    "SOA record needs five numeric timers",
  ],
  [["@", "IN", "NS", "bad/name"], "NS record has an invalid target name"],
  [["@", "IN", "A", "not-an-ip"], "A record has an invalid address"],
  [["@", "IN", "AAAA", "192.0.2.1"], "AAAA record has an invalid address"],
  [["www", "IN", "CNAME", "bad/name"], "CNAME record has an invalid target name"],
  [["1", "IN", "PTR", "bad/name"], "PTR record has an invalid target name"],
  [["@", "IN", "UNKNOWN", "value"], "invalid DNS record"],
  [["@", "IN", "A"], "invalid DNS record"],
])("reports invalid DNS record tokens for %s", (tokens, message) => {
  expect(validateDnsRecord("test.zone", tokens, 2).errors.join(" ")).toContain(message);
});

test("rejects empty record tokens", () => {
  expect(validateDnsRecord("test.zone", [], 1)).toEqual({
    errors: ["FAIL test.zone:1: invalid DNS record."],
    type: null,
  });
});

test.each([
  [["$ORIGIN", "test."], true],
  [["$TTL", "1h"], true],
  [["$INCLUDE", "child.zone", "child.test."], true],
  [["$INCLUDE", "child.zone"], true],
  [["$GENERATE", "1-2", "host$.test.", "A", "192.0.2.$"], true],
  [["$INCLUDE"], false],
  [["$TTL", "bad"], false],
  [["$GENERATE", "invalid", "host"], false],
  [["$UNKNOWN", "value"], false],
])("validates DNS directive tokens for %s", (tokens, valid) => {
  const result = validateDnsRecord("test.zone", tokens, 3);
  expect(result.type).toBeNull();
  expect(result.errors.length === 0).toBe(valid);
});
