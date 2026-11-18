import { expect, test } from "@jest/globals";
import validateDns from "../../../src/preflight/network/dns.mjs";

test("checks SOA timers, DNS targets, and IP record values", () => {
  const valid =
    "@ IN SOA ns.test. host.test. (\n 1 3600 600 86400 300 )\n@ IN NS ns.test.\n@ IN A 192.0.2.1\nwww IN CNAME @\n6 IN PTR ns.test.\n@ IN AAAA 2001:db8::1\n";
  expect(validateDns("var/named/zones/test.zone", valid)).toEqual([]);
  const invalid =
    "@ IN SOA ns.test. host.test. (1)\n@ IN NS bad/name\n@ IN A nope\n@ IN CNAME bad/name\n";
  expect(validateDns("test.zone", invalid).join(" ")).toContain(
    "SOA record needs five numeric timers",
  );
  expect(validateDns("test.zone", invalid).join(" ")).toContain("invalid address");
  expect(validateDns("test.zone", invalid).join(" ")).toContain("invalid target name");
});

test("requires complete DNS zone records and balanced parentheses", () => {
  expect(validateDns("test.zone", "@").join(" ")).toContain("invalid DNS record");
  expect(validateDns("test.zone", ")").join(" ")).toContain("invalid DNS record");
  expect(
    validateDns("test.zone", "$TTL 3600\n@ IN SOA ns.test. host.test. (1\n").join(" "),
  ).toContain("parentheses are not balanced");
});
