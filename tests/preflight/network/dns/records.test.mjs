import { expect, test } from "@jest/globals";
import validateDnsRecord from "../../../../src/preflight/network/dns/records.mjs";
import tokenizeDnsRecord from "../../../../src/preflight/network/dns/tokenize.mjs";

test.each([
  [["A", "IN", "NS", "ns.test."], "NS"],
  [["A", "3600", "IN", "NS", "ns.test."], "NS"],
  [["@", "IN", "SOA", "ns.test.", "host.test.", "1", "3600", "600", "86400", "300"], "SOA"],
  [["@", "IN", "NS", "ns.test."], "NS"],
  [["@", "IN", "A", "192.0.2.1"], "A"],
  [["@", "IN", "AAAA", "2001:db8::1"], "AAAA"],
  [["www", "IN", "CNAME", "@"], "CNAME"],
  [["1", "IN", "PTR", "ns.test."], "PTR"],
  [["@", "IN", "MX", "10", "mail.test."], "MX"],
  [["_service", "IN", "SRV", "1", "2", "443", "server.test."], "SRV"],
  [["@", "IN", "CAA", "0", "issue", '"ca.test"'], "CAA"],
  [["@", "IN", "TXT", '"some value"'], "TXT"],
  [["@", "IN", "TXT", '""', '"v=spf1 -all"'], "TXT"],
])("validates DNS record tokens for %s", (tokens, type) => {
  expect(validateDnsRecord("test.zone", tokens, 1)).toMatchObject({ errors: [], type });
});

test.each([
  [["@", "IN", "SOA", "ns.test.", "host.test.", "1"], "SOA record needs valid names"],
  [
    ["@", "IN", "SOA", "ns.test.", "host.test.", "1", "not-a-time", "600", "86400", "300"],
    "SOA record needs valid names",
  ],
  [["@", "IN", "NS", "bad/name"], "NS record has an invalid target name"],
  [["@", "IN", "A", "not-an-ip"], "A record has an invalid address"],
  [["@", "IN", "AAAA", "192.0.2.1"], "AAAA record has an invalid address"],
  [["www", "IN", "CNAME", "bad/name"], "CNAME record has an invalid target name"],
  [["1", "IN", "PTR", "bad/name"], "PTR record has an invalid target name"],
  [["@", "IN", "UNKNOWN", "value"], "invalid DNS record"],
  [["@", "IN", "A"], "A record has an invalid address"],
])("reports invalid DNS record tokens for %s", (tokens, message) => {
  expect(validateDnsRecord("test.zone", tokens, 2).errors.join(" ")).toContain(message);
});

test.each([
  [["bad/name", "IN", "A", "192.0.2.1"], "invalid DNS record"],
  [["@", "IN", "MX", "mail.test."], "valid preference and target"],
  [["@", "IN", "MX", "bad", "mail.test."], "valid preference and target"],
  [["@", "IN", "MX", undefined, "mail.test."], "valid preference and target"],
  [["@", "IN", "SRV", "1", "2", "3"], "three valid numbers and a target"],
  [["@", "IN", "SRV", "bad", "2", "3", "target.test."], "three valid numbers and a target"],
  [["@", "IN", "SRV", "1", "2", "3", "bad/name"], "three valid numbers and a target"],
  [["@", "IN", "CAA", "999", "issue", '"ca.test"'], "valid flags"],
  [["@", "IN", "CAA", "0", "bad tag", '"ca.test"'], "valid flags"],
  [["@", "IN", "CAA", "0", undefined, '"ca.test"'], "valid flags"],
  [["@", "IN", "CAA", "0", "issue", ""], "valid flags"],
  [["@", "IN", "SOA", "bad/name", "host.test.", "1", "2", "3", "4", "5"], "valid names"],
])("rejects malformed DNS record fields for %s", (tokens, message) => {
  expect(validateDnsRecord("test.zone", tokens, 2).errors.join(" ")).toContain(message);
});

test("rejects empty record tokens", () => {
  expect(validateDnsRecord("test.zone", [], 1)).toEqual({
    errors: ["FAIL test.zone:1: invalid DNS record."],
    type: null,
  });
});

test("rejects an empty TXT token", () => {
  const value = "";
  expect(validateDnsRecord("test.zone", ["@", "IN", "TXT", value], 2).errors).toContain(
    "FAIL test.zone:2: TXT record contains an empty value.",
  );
});

test("accepts a TXT record with multiple quoted character strings", () => {
  const tokens = tokenizeDnsRecord('@ IN TXT "first part" "second part"');
  expect(validateDnsRecord("test.zone", tokens, 2)).toMatchObject({ errors: [], type: "TXT" });
});

test.each([["not-a-string"], ['"quoted"', "not-a-string"], ['"unterminated']])(
  "rejects unquoted or malformed TXT values %s",
  (...values) => {
    expect(validateDnsRecord("test.zone", ["@", "IN", "TXT", ...values], 2).errors).toContain(
      "FAIL test.zone:2: TXT record values must be quoted strings.",
    );
  },
);
