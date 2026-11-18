import { expect, test } from "@jest/globals";
import tokenizeDnsRecord from "../../../../src/preflight/network/dns/tokenize.mjs";

test("splits DNS record fields and removes grouping parentheses", () => {
  expect(tokenizeDnsRecord("@ IN SOA ns.test. host.test. ( 1 3600 )")).toEqual([
    "@",
    "IN",
    "SOA",
    "ns.test.",
    "host.test.",
    "1",
    "3600",
  ]);
});

test("keeps quoted record fields and escaped quotes together", () => {
  expect(tokenizeDnsRecord('txt IN TXT "a \\\"quoted\\\" value"')).toEqual([
    "txt",
    "IN",
    "TXT",
    '"a \\\"quoted\\\" value"',
  ]);
  expect(tokenizeDnsRecord("")).toEqual([]);
});
