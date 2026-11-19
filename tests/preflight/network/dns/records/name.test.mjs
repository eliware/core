import { expect, test } from "@jest/globals";
import isValidDnsName from "../../../../../src/preflight/network/dns/records/name.mjs";

test.each(["@", ".", "host.test", "_service.test", "*.wild.test"])("accepts DNS name %s", (name) =>
  expect(isValidDnsName(name)).toBe(true),
);

test.each(["", "bad/name", "bad name"])("rejects DNS name %s", (name) => {
  expect(isValidDnsName(name)).toBe(false);
});
