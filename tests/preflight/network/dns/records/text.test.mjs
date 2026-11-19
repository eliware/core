import { expect, test } from "@jest/globals";
import validateTextRecord from "../../../../../src/preflight/network/dns/records/text.mjs";

test.each([
  ["CAA", ["0", "issue", '"ca.test"'], null],
  ["CAA", ["256", "issue", '"ca.test"'], "CAA record needs valid flags, a tag, and a value"],
  ["CAA", ["bad", "issue", '"ca.test"'], "CAA record needs valid flags, a tag, and a value"],
  ["CAA", ["0", "bad tag", '"ca.test"'], "CAA record needs valid flags, a tag, and a value"],
  ["CAA", ["0", "issue", ""], "CAA record needs valid flags, a tag, and a value"],
  ["CAA", ["0", "issue"], "CAA record needs valid flags, a tag, and a value"],
  ["CAA", [], "CAA record needs valid flags, a tag, and a value"],
  ["TXT", ['"quoted"'], null],
  ["TXT", ['"first"', '"second"'], null],
  ["TXT", [""], "TXT record contains an empty value"],
  ["TXT", ["unquoted"], "TXT record values must be quoted strings"],
  ["TXT", [], "TXT record values must be quoted strings"],
  ["A", ["192.0.2.1"], null],
])("validates %s record text fields", (type, fields, expected) => {
  expect(validateTextRecord(type, fields)).toBe(expected);
});
