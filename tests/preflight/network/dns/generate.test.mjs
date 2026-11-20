import { expect, test } from "@jest/globals";
import isValidGenerate from "../../../../src/preflight/network/dns/generate.mjs";

test.each([
  [["$GENERATE", "1-2", "host$.test.", "A", "192.0.2.$"], true],
  [["$GENERATE", "1-2", "host$.test.", "1h", "IN", "A", "192.0.2.$"], true],
  [["$GENERATE", "1-2", "bad/name$", "A", "192.0.2.$"], false],
  [["$GENERATE", "1-2"], false],
  [["$GENERATE", "1-2", "host$.test.", "A", "not-an-ip.$"], false],
  [["$GENERATE", "1-2", "host$.test.", "A", "192.0.2.$", "extra"], false],
  [["$GENERATE", "1-2", "host$.test.", "1h", "2h", "A", "192.0.2.$"], false],
  [["$GENERATE", "1-2", "host$.test.", "SOA", "ns.test."], false],
])("validates generated DNS records %s", (tokens, valid) => {
  expect(isValidGenerate(tokens)).toBe(valid);
});
