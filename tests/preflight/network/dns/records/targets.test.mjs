import { expect, test } from "@jest/globals";
import validateTargetRecord from "../../../../../src/preflight/network/dns/records/targets.mjs";

test.each([
  ["SOA", ["ns.test.", "host.test.", "1", "2", "3", "4", "5"], null],
  ["SOA", ["bad/name", "host.test.", "1", "2", "3", "4", "5"], "SOA record"],
  ["NS", ["ns.test."], null],
  ["NS", ["bad/name"], "NS record"],
  ["PTR", ["host.test."], null],
  ["CNAME", ["host.test."], null],
  ["PTR", ["bad/name"], "PTR record"],
  ["MX", ["10", "mail.test."], null],
  ["MX", ["bad", "mail.test."], "MX record"],
  ["SRV", ["1", "2", "443", "server.test."], null],
  ["SRV", ["1", "2", "bad", "server.test."], "SRV record"],
  ["TXT", ["quoted"], null],
])("validates %s record target fields", (type, fields, expected) => {
  const result = validateTargetRecord(type, fields);
  if (expected === null) expect(result).toBeNull();
  else expect(result).toContain(expected);
});
