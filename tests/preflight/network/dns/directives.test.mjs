import { expect, test } from "@jest/globals";
import validateDnsDirective from "../../../../src/preflight/network/dns/directives.mjs";

test.each([
  [["$ORIGIN", "test."], true],
  [["$TTL", "1h"], true],
  [["$INCLUDE", "child.zone", "child.test."], true],
  [["$INCLUDE", "child.zone"], true],
  [["$INCLUDE", "bad/name"], true],
  [["$INCLUDE", "bad//name"], false],
  [["$INCLUDE", "../child.zone"], false],
  [["$INCLUDE", ""], false],
  [["$INCLUDE", undefined], false],
  [["$GENERATE", "1-2", "host$.test.", "A", "192.0.2.$"], true],
  [["$GENERATE", "1-2", "host$.test.", "1h", "IN", "A", "192.0.2.$"], true],
  [["$GENERATE", "1-2", "bad/name$", "A", "192.0.2.$"], false],
  [["$GENERATE", "1-2"], false],
  [["$GENERATE", "1-2", "host$.test.", "A", "not-an-ip.$"], false],
  [["$GENERATE", "1-2", "host$.test.", "A", "192.0.2.$", "extra"], false],
  [["$GENERATE", "1-2", "host$.test.", "A", "192.0.2.$"], true],
  [["$GENERATE", "1-2", "host$.test.", "1h", "2h", "A", "192.0.2.$"], false],
  [["$GENERATE", "1-2", "host$.test.", "SOA", "ns.test."], false],
  [["$INCLUDE"], false],
  [["$TTL", "bad"], false],
  [["$GENERATE", "invalid", "host"], false],
  [["$UNKNOWN", "value"], false],
])("validates DNS directive tokens for %s", (tokens, valid) => {
  const errors = validateDnsDirective("test.zone", tokens, 3);
  expect(errors.length === 0).toBe(valid);
});
